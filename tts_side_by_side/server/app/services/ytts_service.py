"""YTTS Service"""
import os
import tempfile
import base64
import json
import traceback
import pickle
import requests
import numpy as np
from pathlib import Path
from app.utils.audio_utils import convert_to_wav
from .checkpoint_service import CheckpointService


class TorchUnpickler(pickle.Unpickler):
    """
    Custom unpickler to load PyTorch .pth files without torch installed.

    Handles both legacy pickle format and newer ZIP-based format.
    For ZIP format, loads tensor data from archive/.data/ directory.
    Converts PyTorch tensors to numpy arrays for JSON serialization.

    This allows the Cantina API (v1.0.2) to work on Vercel without the
    large torch dependency (~250MB+).
    """
    def __init__(self, *args, zip_file=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.storage_map = {}  # Map persistent IDs to storage objects
        self.zip_file = zip_file  # Optional ZIP file for loading data files

    def persistent_load(self, pid):
        """
        Handle PyTorch's persistent tensor storage references.
        PyTorch saves tensors with persistent IDs that reference storage objects.

        In protocol 0, pid is a string. In newer protocols, it's a tuple.
        """
        # Protocol 0: pid is a string identifier
        if isinstance(pid, str):
            # If we have a ZIP file, try to load data from archive/.data/
            if self.zip_file is not None:
                data_path = f"archive/.data/{pid}"
                if data_path in self.zip_file.namelist():
                    print(f"[YTTS] Loading storage from ZIP: {data_path}")
                    try:
                        with self.zip_file.open(data_path) as f:
                            # Read binary data and convert to numpy array
                            data_bytes = f.read()
                            # Assume float32 for now (most common)
                            storage = np.frombuffer(data_bytes, dtype=np.float32)
                            self.storage_map[pid] = storage
                            print(f"[YTTS] Loaded storage {pid}: shape={storage.shape}")
                            return storage
                    except Exception as e:
                        print(f"[YTTS] Error loading storage {pid}: {e}")

            # Create or return existing storage for this ID
            if pid not in self.storage_map or self.storage_map[pid] is None:
                # Create a placeholder storage object
                storage = TorchStorage(pid)
                self.storage_map[pid] = storage
            return self.storage_map[pid]

        # Newer protocols: pid is a tuple like ('storage', storage_type, key, location, size)
        if isinstance(pid, tuple) and len(pid) > 0:
            type_tag = pid[0]
            if type_tag == 'storage':
                storage_type, key, location, numel = pid[1:5]

                # If we have a ZIP file, try loading from it
                if self.zip_file is not None and location:
                    data_path = f"archive/.data/{location}"
                    if data_path in self.zip_file.namelist():
                        print(f"[YTTS] Loading storage from ZIP: {data_path}")
                        try:
                            with self.zip_file.open(data_path) as f:
                                data_bytes = f.read()
                                # Determine dtype from storage_type
                                if 'Float' in str(storage_type):
                                    dtype = np.float32
                                elif 'Long' in str(storage_type):
                                    dtype = np.int64
                                elif 'Double' in str(storage_type):
                                    dtype = np.float64
                                else:
                                    dtype = np.float32

                                storage = np.frombuffer(data_bytes, dtype=dtype)
                                self.storage_map[key] = storage
                                print(f"[YTTS] Loaded storage {key}: shape={storage.shape}")
                                return storage
                        except Exception as e:
                            print(f"[YTTS] Error loading storage {key}: {e}")

                # Fallback: Create empty numpy array
                if 'Float' in str(storage_type):
                    dtype = np.float32
                elif 'Long' in str(storage_type):
                    dtype = np.int64
                elif 'Int' in str(storage_type):
                    dtype = np.int32
                elif 'Short' in str(storage_type):
                    dtype = np.int16
                elif 'Char' in str(storage_type):
                    dtype = np.int8
                elif 'Byte' in str(storage_type):
                    dtype = np.uint8
                elif 'Double' in str(storage_type):
                    dtype = np.float64
                else:
                    dtype = np.float32

                storage = np.zeros(numel, dtype=dtype)
                self.storage_map[key] = storage
                return storage

        # Return the pid itself for unrecognized formats
        return pid

    def find_class(self, module, name):
        # Intercept torch tensor classes and use a stub
        if module.startswith('torch'):
            if name == 'FloatStorage' or name.endswith('Storage'):
                # Storage classes contain the actual tensor data
                return TorchStorage
            elif name in ['Tensor', 'Parameter', 'LongTensor', 'FloatTensor']:
                # Tensor classes - reconstruct from storage
                return TorchTensor
            elif name == '_rebuild_tensor_v2':
                # PyTorch tensor rebuilder function
                return rebuild_tensor_v2
        return super().find_class(module, name)


class TorchStorage:
    """Stub for torch storage objects"""
    def __init__(self, *args):
        if len(args) > 0:
            self.id = args[0]
        else:
            self.id = None
        self.data = None

    def _set_from_file(self, *args):
        pass

    def _set_cdata(self, cdata):
        """Set data from C data pointer (not used but needed for compatibility)"""
        pass

    def __len__(self):
        return len(self.data) if self.data is not None else 0


class TorchTensor:
    """Stub for torch tensor objects that can be converted to numpy"""
    def __init__(self, storage=None, storage_offset=0, size=None, stride=None, requires_grad=False):
        self.storage = storage
        self.storage_offset = storage_offset
        self.size = size or []
        self.stride = stride or []
        self.requires_grad = requires_grad

    def __reduce_ex__(self, proto):
        # This is called during unpickling
        return (self.__class__, ())

    def numpy(self):
        """Convert to numpy array"""
        if hasattr(self, '_numpy_data'):
            return self._numpy_data

        # Reconstruct tensor from storage
        if self.storage is not None:
            # Handle numpy array storage
            if isinstance(self.storage, np.ndarray):
                # Extract the data from storage using offset and size
                if len(self.size) == 0:
                    return np.array([])

                total_elements = int(np.prod(self.size))
                offset = self.storage_offset

                # Get flat data from storage
                flat_data = self.storage[offset:offset + total_elements]

                # Reshape to the correct size
                try:
                    return flat_data.reshape(self.size)
                except:
                    return flat_data

            # Handle TorchStorage object
            elif isinstance(self.storage, TorchStorage):
                if self.storage.data is not None and isinstance(self.storage.data, np.ndarray):
                    if len(self.size) == 0:
                        return np.array([])

                    total_elements = int(np.prod(self.size))
                    offset = self.storage_offset

                    flat_data = self.storage.data[offset:offset + total_elements]
                    try:
                        return flat_data.reshape(self.size)
                    except:
                        return flat_data

        return np.array([])

    def tolist(self):
        """Convert to list"""
        return self.numpy().tolist()

    @property
    def shape(self):
        """Return shape for compatibility"""
        return tuple(self.size)


def rebuild_tensor_v2(storage, storage_offset, size, stride, requires_grad=False, backward_hooks=None):
    """
    Rebuild a tensor from its components.
    This is PyTorch's tensor reconstruction function.
    """
    tensor = TorchTensor(storage, storage_offset, size, stride, requires_grad)
    return tensor


def load_pth_without_torch(file_path):
    """
    Load a PyTorch .pth file without torch installed.

    Supports:
    - ZIP-based format (torch.save with _use_new_zipfile_serialization=True)
    - Legacy pickle format (older torch versions)

    Strategy:
    1. Try loading as ZIP archive with data in archive/data.pkl
    2. Fall back to legacy pickle with multiple encoding attempts
    3. Convert all tensors to JSON-serializable format (lists with shape/dtype)

    Returns embeddings dict with numpy arrays converted to lists.
    """
    import zipfile
    import io

    print(f"[YTTS] Loading .pth file without torch: {file_path}")

    # Check if it's a ZIP file (newer PyTorch format)
    try:
        with zipfile.ZipFile(file_path, 'r') as zf:
            print(f"[YTTS] File is a ZIP archive (newer PyTorch format)")
            print(f"[YTTS] ZIP contents: {zf.namelist()}")

            # Try different pickle locations in the ZIP
            pickle_locations = ['data.pkl', 'archive/data.pkl', 'data/data.pkl']

            for pkl_path in pickle_locations:
                if pkl_path in zf.namelist():
                    print(f"[YTTS] Found pickle at: {pkl_path}")
                    try:
                        with zf.open(pkl_path) as f:
                            # Pass the ZIP file to unpickler so it can load data files from archive/.data/
                            unpickler = TorchUnpickler(io.BytesIO(f.read()), zip_file=zf)
                            unpickler.encoding = 'latin1'
                            embeddings = unpickler.load()
                        print(f"[YTTS] ✓ Successfully loaded from ZIP format")
                        print(f"[YTTS] Loaded embeddings with keys: {list(embeddings.keys())}")
                        return _convert_embeddings(embeddings)
                    except Exception as e:
                        print(f"[YTTS] Failed to load {pkl_path}: {e}")
                        continue

            print(f"[YTTS] Could not find valid pickle file in ZIP")
    except zipfile.BadZipFile:
        print(f"[YTTS] Not a ZIP file, trying legacy pickle format...")
    except Exception as e:
        print(f"[YTTS] ZIP loading failed: {e}, trying legacy pickle format...")

    # Try different loading strategies for legacy pickle format
    embeddings = None
    last_error = None

    # Strategy 1: Try with latin1 encoding (more permissive)
    try:
        print(f"[YTTS] Trying to load with latin1 encoding...")
        with open(file_path, 'rb') as f:
            unpickler = TorchUnpickler(f)
            unpickler.encoding = 'latin1'
            embeddings = unpickler.load()
        print(f"[YTTS] ✓ Successfully loaded with latin1 encoding")
    except Exception as e:
        print(f"[YTTS] ✗ Failed with latin1: {e}")
        last_error = e

    # Strategy 2: Try with ASCII encoding
    if embeddings is None:
        try:
            print(f"[YTTS] Trying to load with ASCII encoding...")
            with open(file_path, 'rb') as f:
                unpickler = TorchUnpickler(f)
                unpickler.encoding = 'ASCII'
                embeddings = unpickler.load()
            print(f"[YTTS] ✓ Successfully loaded with ASCII encoding")
        except Exception as e:
            print(f"[YTTS] ✗ Failed with ASCII: {e}")
            last_error = e

    # Strategy 3: Try with bytes encoding
    if embeddings is None:
        try:
            print(f"[YTTS] Trying to load with bytes encoding...")
            with open(file_path, 'rb') as f:
                unpickler = TorchUnpickler(f)
                unpickler.encoding = 'bytes'
                embeddings = unpickler.load()
            print(f"[YTTS] ✓ Successfully loaded with bytes encoding")
        except Exception as e:
            print(f"[YTTS] ✗ Failed with bytes: {e}")
            last_error = e

    if embeddings is None:
        raise RuntimeError(f"Failed to load .pth file with all strategies. Last error: {last_error}")

    print(f"[YTTS] Loaded embeddings with keys: {list(embeddings.keys())}")
    return _convert_embeddings(embeddings)


def _convert_embeddings(embeddings):
    """Convert embeddings to serializable format"""

    # Convert any remaining torch-like objects to simple structures
    serialized = {}
    for key, value in embeddings.items():
        if isinstance(value, TorchTensor):
            # Our custom TorchTensor - convert to numpy then to list
            arr = value.numpy()
            serialized[key] = {
                "data": arr.tolist(),
                "shape": list(value.shape),
                "dtype": str(arr.dtype)
            }
            print(f"[YTTS] Converted {key}: shape={value.shape}, dtype={arr.dtype}")
        elif isinstance(value, np.ndarray):
            # Already numpy
            serialized[key] = {
                "data": value.tolist(),
                "shape": list(value.shape),
                "dtype": str(value.dtype)
            }
            print(f"[YTTS] Numpy array {key}: shape={value.shape}, dtype={value.dtype}")
        elif hasattr(value, 'numpy'):
            # Has numpy method
            arr = value.numpy()
            serialized[key] = {
                "data": arr.tolist(),
                "shape": list(arr.shape),
                "dtype": str(arr.dtype)
            }
            print(f"[YTTS] Converted {key} via numpy(): shape={arr.shape}")
        elif hasattr(value, 'tolist'):
            # Has tolist (like a list)
            shape = getattr(value, 'shape', [len(value)])
            serialized[key] = {
                "data": value.tolist() if hasattr(value, 'tolist') else list(value),
                "shape": list(shape) if hasattr(shape, '__iter__') else [shape],
                "dtype": str(type(value).__name__)
            }
            print(f"[YTTS] Converted {key} via tolist()")
        else:
            # Fallback - just store as is
            serialized[key] = value
            print(f"[YTTS] Stored {key} as-is (type={type(value).__name__})")

    return serialized

MODEL_CONFIGS = {
    "ytts_v1.0.2": {
        "name": "v1.0.2 (Cantina API)",
        "type": "api",
        "api_url": "https://cantina-ytts.ngrok.app",
        "endpoints": {"clone_speaker": "/clone_speaker", "tts": "/tts"},
    },
    "ytts_v1.1.0": {
        "name": "v1.1.0 (Tahoe API)",
        "type": "api",
        "api_url": "https://tahoe.prod.airtime.com",
        "endpoints": {
            "create_voice": "/voices",
            "get_voice": "/voices/{voice_id}",
            "get_voice_representation": "/voices/{provider}/{voice_id}",
            "create_sample": "/voices/{voice_id}/sample",
        },
    },
    "haitong": {
        "name": "Haitong's Candidate",
        "type": "checkpoint",
        "checkpoint_id": "haitong",
    },
    "zbigniew": {
        "name": "Zbigniew's Candidate",
        "type": "checkpoint",
        "checkpoint_id": "zbigniew",
    },
    "julian": {
        "name": "Julian's Candidate",
        "type": "checkpoint",
        "checkpoint_id": "julian",
    },
}

DECODER_CHECKPOINT = "s3://cantina-tts-checkpoints-us-east-2/runs/AudioCodecs/accoto_decoder_ft.69996384976446e799f1e882104da59b/300k/"


class YTTSService:
    """Service for YTTS API and checkpoint-based models"""

    def __init__(self):
        self.api_url = os.getenv("YTTS_API_URL", "https://cantina-ytts.ngrok.app")
        self.api_key = os.getenv("YTTS_API_KEY", "")
        self.decoder_checkpoint = DECODER_CHECKPOINT
        self.model_configs = MODEL_CONFIGS
        self.checkpoint_service = CheckpointService()

    def clone_voice(self, audio_file_path: str, model: str = "ytts_v1.0.2") -> dict:
        """Clone voice from audio file, returns embeddings dict"""
        model_config = self.model_configs.get(model, self.model_configs["ytts_v1.0.2"])

        print(f"\n[YTTS CLONE] Starting voice clone")
        print(f"[YTTS CLONE] Audio file: {audio_file_path}")
        print(f"[YTTS CLONE] Model: {model_config['name']} ({model_config['type']})")

        if model_config['type'] == 'api':
            # Check which cloning method to use
            if 'clone_speaker' in model_config.get('endpoints', {}):
                # Cantina API - direct base64 cloning
                return self._clone_voice_cantina(audio_file_path, model_config)
            elif 'create_voice' in model_config.get('endpoints', {}):
                # Tahoe API - URL-based voice creation
                return self._clone_voice_tahoe(audio_file_path, model_config)
            else:
                raise ValueError(f"Model {model} does not support voice cloning. Available endpoints: {list(model_config.get('endpoints', {}).keys())}")
        elif model_config['type'] == 'checkpoint':
            # Delegate to CheckpointService
            checkpoint_id = model_config['checkpoint_id']
            print(f"[YTTS CLONE] Delegating to CheckpointService for: {checkpoint_id}")
            return self.checkpoint_service.clone_voice(audio_file_path, checkpoint_id)
        else:
            raise ValueError(f"Unknown model type: {model_config['type']}")

    def _clone_voice_cantina(self, audio_file_path: str, model_config: dict) -> dict:
        """Clone voice using HTTP API (v1.0.2 Cantina)"""
        api_url = model_config['api_url']
        clone_endpoint = model_config['endpoints']['clone_speaker']
        print(f"[YTTS CLONE API] Using API URL: {api_url}")

        try:
            # Read and encode audio file
            with open(audio_file_path, 'rb') as f:
                wav_data = f.read()
                wav_base64 = base64.b64encode(wav_data).decode('utf-8')

            print(f"[YTTS CLONE API] Audio file size: {len(wav_data)} bytes")
            print(f"[YTTS CLONE API] Base64 size: {len(wav_base64)} chars")

            # Send clone request
            clone_url = f"{api_url}{clone_endpoint}"
            print(f"[YTTS CLONE API] POST to {clone_url}")

            response = requests.post(
                clone_url,
                json={"wav_base64": wav_base64},
                timeout=60
            )

            print(f"[YTTS CLONE API] Response status: {response.status_code}")
            print(f"[YTTS CLONE API] Response content-type: {response.headers.get('content-type')}")
            print(f"[YTTS CLONE API] Response size: {len(response.content)} bytes")

            response.raise_for_status()

            # Response is a .pth file containing embeddings - load without torch
            with tempfile.NamedTemporaryFile(suffix=".pth", delete=False) as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name

            # Use our custom loader that doesn't require torch
            serialized_embeddings = load_pth_without_torch(tmp_path)
            os.unlink(tmp_path)

            print(f"[YTTS CLONE API] Embeddings keys: {list(serialized_embeddings.keys())}")
            for key, value in serialized_embeddings.items():
                if isinstance(value, dict) and 'shape' in value:
                    print(f"[YTTS CLONE API] Serialized {key}: shape={value['shape']}")

            print(f"[YTTS CLONE API] ✓ Clone successful")

            return {
                "type": "api",
                "embeddings": serialized_embeddings,
                "model_config": model_config
            }

        except Exception as e:
            print(f"[YTTS CLONE API] ✗ Error: {str(e)}")
            traceback.print_exc()
            raise

    def _clone_voice_tahoe(self, audio_file_path: str, model_config: dict) -> dict:
        """
        Clone voice using Tahoe API (v1.1.0).

        Tahoe requires WAV format and uses multipart form upload with metadata.
        Returns a voice object with sample-url for TTS generation.
        """
        api_url = model_config['api_url']
        create_voice_endpoint = model_config['endpoints']['create_voice']

        print(f"[YTTS CLONE TAHOE] Using API URL: {api_url}")
        print(f"[YTTS CLONE TAHOE] Local file: {audio_file_path}")

        # Tahoe API strictly requires WAV format - convert if needed
        wav_file_path = None
        needs_cleanup = False
        try:
            wav_file_path = convert_to_wav(audio_file_path)
            needs_cleanup = (wav_file_path != audio_file_path)
            print(f"[YTTS CLONE TAHOE] WAV file: {wav_file_path} (cleanup={needs_cleanup})")
        except Exception as e:
            print(f"[YTTS CLONE TAHOE] ✗ Error converting audio to WAV: {e}")
            raise

        try:
            # Multipart form upload with metadata
            create_url = f"{api_url}{create_voice_endpoint}"
            print(f"[YTTS CLONE TAHOE] POST to {create_url} (multipart upload with metadata)")

            # Prepare metadata
            filename = os.path.basename(wav_file_path)
            metadata = {
                "display-name": filename.replace('.wav', '').replace('.mp3', ''),
                "app-id": "tts-side-by-side",
                "creator": "tts-comparison-tool"
            }
            print(f"[YTTS CLONE TAHOE] Metadata: {metadata}")

            with open(wav_file_path, 'rb') as audio_file:
                files = {
                    'file': (filename, audio_file, 'audio/wav'),
                    'metadata': (None, json.dumps(metadata), 'application/json')
                }

                response = requests.post(
                    create_url,
                    files=files,
                    timeout=120
                )

            print(f"[YTTS CLONE TAHOE] Response status: {response.status_code}")
            print(f"[YTTS CLONE TAHOE] Response content-type: {response.headers.get('content-type')}")

            # Log response body for debugging
            if response.status_code >= 400:
                print(f"[YTTS CLONE TAHOE] Error response body: {response.text}")
            else:
                print(f"[YTTS CLONE TAHOE] Success response body: {response.text[:500]}")

            response.raise_for_status()

            voice_data = response.json()
            print(f"[YTTS CLONE TAHOE] Voice data keys: {list(voice_data.keys())}")
            print(f"[YTTS CLONE TAHOE] ✓ Voice created successfully")

            return {
                "type": "tahoe",
                "voice_url": voice_data.get("self"),  # Full voice URL
                "voice_id": voice_data.get("self", "").split("/")[-1] if voice_data.get("self") else None,
                "provider": voice_data.get("provider"),
                "display_name": voice_data.get("display-name"),
                "sample_url": voice_data.get("sample-url"),
                "model_config": model_config
            }

        except Exception as e:
            print(f"[YTTS CLONE TAHOE] ✗ Error: {str(e)}")
            traceback.print_exc()
            raise
        finally:
            # Clean up converted WAV file if we created a new one
            if needs_cleanup and wav_file_path and os.path.exists(wav_file_path):
                print(f"[YTTS CLONE TAHOE] Cleaning up converted file: {wav_file_path}")
                os.unlink(wav_file_path)

    def generate_speech(self, text: str, voice_data: dict, settings: dict = None) -> str:
        """Generate speech from text, returns path to audio file"""
        settings = settings or {}
        model = settings.get("model", "ytts_v1.0.2")
        temperature = settings.get("temperature", 0.9)
        top_p = settings.get("top_p", 0.85)
        top_k = settings.get("top_k", 230)
        audio_temperature = settings.get("audio_temperature", 0.55)

        print(f"\n[YTTS GENERATE] Starting speech generation")
        print(f"[YTTS GENERATE] Text: {text[:80]}...")
        print(f"[YTTS GENERATE] Voice data keys: {list(voice_data.keys())}")
        print(f"[YTTS GENERATE] Voice data type: {voice_data.get('type')}")
        print(f"[YTTS GENERATE] Model: {model}")
        print(f"[YTTS GENERATE] Params: temp={temperature}, top_p={top_p}, top_k={top_k}, audio_temp={audio_temperature}")

        # Check voice data type and delegate appropriately
        if voice_data.get("type") == "checkpoint":
            # Delegate to CheckpointService
            print(f"[YTTS GENERATE] Delegating to CheckpointService")
            return self.checkpoint_service.generate_speech(text, voice_data, settings)
        elif voice_data.get("type") == "api":
            # Check if we have embeddings
            if "embeddings" not in voice_data:
                raise ValueError(f"Voice data missing 'embeddings' key. Available keys: {list(voice_data.keys())}")
            return self._generate_speech_api(text, voice_data, settings)
        elif voice_data.get("type") == "tahoe":
            # Tahoe API uses sample-url for TTS generation
            if "sample_url" not in voice_data:
                raise ValueError(f"Voice data missing 'sample_url' key. Available keys: {list(voice_data.keys())}")
            return self._generate_speech_tahoe(text, voice_data, settings)
        else:
            raise ValueError(f"Unknown voice data type: {voice_data.get('type')}")

    def _generate_speech_tahoe(self, text: str, voice_data: dict, settings: dict) -> str:
        """
        Generate speech using Tahoe API (v1.1.0).

        Posts text to the voice's sample-url endpoint and streams back audio.
        Tahoe typically returns MP4/AAC format audio.
        """
        sample_url = voice_data["sample_url"]

        print(f"[YTTS GENERATE TAHOE] Using sample URL: {sample_url}")
        print(f"[YTTS GENERATE TAHOE] Text: {text[:80]}...")

        try:
            # Send TTS request to sample-url
            payload = {"text": text}
            print(f"[YTTS GENERATE TAHOE] POST to {sample_url}")

            response = requests.post(
                sample_url,
                json=payload,
                stream=True,
                timeout=120
            )

            print(f"[YTTS GENERATE TAHOE] Response status: {response.status_code}")
            print(f"[YTTS GENERATE TAHOE] Response content-type: {response.headers.get('content-type')}")

            response.raise_for_status()

            # Save audio stream to temp file
            # Tahoe returns audio (typically MP4/AAC format)
            content_type = response.headers.get('content-type', '')
            if 'mp4' in content_type or 'mpeg' in content_type:
                suffix = '.mp4'
            elif 'wav' in content_type:
                suffix = '.wav'
            else:
                # Default to mp3 for generic audio types
                suffix = '.mp3'

            temp_file = tempfile.NamedTemporaryFile(suffix=suffix, delete=False, dir=tempfile.gettempdir())

            # Write response stream in chunks
            bytes_written = 0
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    temp_file.write(chunk)
                    bytes_written += len(chunk)

            temp_file.close()

            print(f"[YTTS GENERATE TAHOE] Audio data size: {bytes_written} bytes")
            print(f"[YTTS GENERATE TAHOE] ✓ Audio saved to {temp_file.name}")

            return temp_file.name

        except Exception as e:
            print(f"[YTTS GENERATE TAHOE] ✗ Error: {str(e)}")
            traceback.print_exc()
            raise

    def _generate_speech_api(self, text: str, voice_data: dict, settings: dict) -> str:
        """Generate speech using HTTP API"""
        model_config = voice_data["model_config"]
        embeddings = voice_data["embeddings"]
        api_url = model_config["api_url"]

        print(f"[YTTS GENERATE API] Using API URL: {api_url}")
        print(f"[YTTS GENERATE API] Embeddings keys: {list(embeddings.keys())}")
        print(f"[YTTS GENERATE API] gpt_cond_latent type: {type(embeddings.get('gpt_cond_latent'))}")

        try:
            # Deserialize embeddings back from JSON format
            if "gpt_cond_latent" in embeddings and isinstance(embeddings["gpt_cond_latent"], dict):
                # Embeddings are in serialized format (dict with "data", "shape", "dtype")
                print(f"[YTTS GENERATE API] Deserializing embeddings from JSON format")
                gpt_cond_latent = embeddings["gpt_cond_latent"]["data"]
                speaker_embedding = embeddings.get("speaker_embedding", {}).get("data")
                print(f"[YTTS GENERATE API] gpt_cond_latent shape: {embeddings['gpt_cond_latent']['shape']}")
                if speaker_embedding is not None:
                    print(f"[YTTS GENERATE API] speaker_embedding shape: {embeddings['speaker_embedding']['shape']}")
            elif "gpt_cond_latent" in embeddings and isinstance(embeddings["gpt_cond_latent"], list):
                # Embeddings are already plain lists (already deserialized)
                print(f"[YTTS GENERATE API] Embeddings already in list format")
                gpt_cond_latent = embeddings["gpt_cond_latent"]
                speaker_embedding = embeddings.get("speaker_embedding")
                print(f"[YTTS GENERATE API] gpt_cond_latent length: {len(gpt_cond_latent)}")
                if speaker_embedding is not None:
                    print(f"[YTTS GENERATE API] speaker_embedding length: {len(speaker_embedding)}")
            else:
                # Embeddings are in unexpected format - try to convert
                print(f"[YTTS GENERATE API] Converting embeddings to lists (fallback)")
                gpt_cond_latent = embeddings["gpt_cond_latent"].tolist() if hasattr(embeddings["gpt_cond_latent"], 'tolist') else embeddings["gpt_cond_latent"]
                speaker_embedding = embeddings.get("speaker_embedding")
                if speaker_embedding is not None and hasattr(speaker_embedding, 'tolist'):
                    speaker_embedding = speaker_embedding.tolist()

            # Build payload
            payload = {
                "text": text,
                "gpt_cond_latent": gpt_cond_latent,
                "speaker_embedding": speaker_embedding,
                "language": "en",
                "add_wav_header": True,
            }

            # Send TTS request
            tts_url = f"{api_url}/tts"
            print(f"[YTTS GENERATE API] POST to {tts_url}")

            response = requests.post(
                tts_url,
                json=payload,
                timeout=120
            )

            print(f"[YTTS GENERATE API] Response status: {response.status_code}")
            print(f"[YTTS GENERATE API] Response content-type: {response.headers.get('content-type')}")

            response.raise_for_status()

            # Response is base64-encoded WAV audio
            audio_base64 = response.json()
            audio_data = base64.b64decode(audio_base64)

            print(f"[YTTS GENERATE API] Audio data size: {len(audio_data)} bytes")

            # Save to temp file
            temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False, dir=tempfile.gettempdir())
            temp_file.write(audio_data)
            temp_file.close()

            print(f"[YTTS GENERATE API] ✓ Audio saved to {temp_file.name}")
            return temp_file.name

        except Exception as e:
            print(f"[YTTS GENERATE API] ✗ Error: {str(e)}")
            traceback.print_exc()
            raise
