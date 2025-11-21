"""TTS routes for voice cloning and generation"""
import os
import tempfile
import traceback
from pathlib import Path
import boto3

from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename

from app.services.provider_registry import get_provider_registry
from app.utils.audio_utils import validate_audio_file

tts_bp = Blueprint("tts", __name__)

# Get provider registry
provider_registry = get_provider_registry()

# S3 configuration for golden set
S3_BUCKET = "cantina-nicholas"
S3_GOLDEN_SET_PREFIX = "audio-golden-set/"
S3_REGION = "us-east-2"

# Initialize S3 client
try:
    # Build S3 client config - only include credentials if they're set
    s3_config = {'region_name': S3_REGION}

    aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
    aws_session_token = os.getenv("AWS_SESSION_TOKEN")

    if aws_access_key:
        s3_config['aws_access_key_id'] = aws_access_key
    if aws_secret_key:
        s3_config['aws_secret_access_key'] = aws_secret_key
    if aws_session_token:
        s3_config['aws_session_token'] = aws_session_token

    s3_client = boto3.client('s3', **s3_config)
    print(f"[TTS ROUTES] S3 client initialized for golden set: s3://{S3_BUCKET}/{S3_GOLDEN_SET_PREFIX}")
except Exception as e:
    print(f"[TTS ROUTES] Warning: Could not initialize S3 client: {e}")
    s3_client = None


@tts_bp.route("/clone-voice", methods=["POST"])
def clone_voice():
    """Clone voice from uploaded audio or golden set file"""
    print("\n" + "="*80)
    print("[CLONE ROUTE] Received clone request")
    try:
        if request.is_json:
            data = request.get_json()
            provider = data.get("provider", "elevenlabs")
            model = data.get("model")
            golden_set_filename = data.get("filename")
            print(f"[CLONE ROUTE] JSON request - provider: {provider}, model: {model}, file: {golden_set_filename}")
        else:
            provider = request.form.get("provider", "elevenlabs")
            model = request.form.get("model")
            golden_set_filename = None
            print(f"[CLONE ROUTE] FormData request - provider: {provider}, model: {model}")

        if not provider_registry.is_valid_provider(provider):
            print(f"[CLONE ROUTE] ✗ Unknown provider: {provider}")
            return jsonify({"error": f"Unknown provider: {provider}"}), 400

        temp_path = None
        needs_cleanup = False

        if golden_set_filename:
            filename = secure_filename(golden_set_filename)
            print(f"[CLONE ROUTE] Fetching golden set file from S3: {filename}")

            if not s3_client:
                return jsonify({"error": "S3 client not available"}), 500

            # Download from S3 to temp file
            s3_key = f"{S3_GOLDEN_SET_PREFIX}{filename}"
            with tempfile.NamedTemporaryFile(suffix=Path(filename).suffix, delete=False) as tmp:
                try:
                    print(f"[CLONE ROUTE] Downloading s3://{S3_BUCKET}/{s3_key}")
                    s3_client.download_fileobj(S3_BUCKET, s3_key, tmp)
                    temp_path = tmp.name
                    needs_cleanup = True
                    print(f"[CLONE ROUTE] Downloaded to {temp_path}")
                except Exception as e:
                    print(f"[CLONE ROUTE] Error downloading from S3: {e}")
                    return jsonify({"error": f"Golden set file not found: {filename}"}), 404
        else:
            if "audio" not in request.files:
                return jsonify({"error": "No audio file provided"}), 400

            audio_file = request.files["audio"]
            if audio_file.filename == "":
                return jsonify({"error": "No file selected"}), 400

            filename = secure_filename(audio_file.filename)
            file_ext = Path(filename).suffix.lower()

            if not validate_audio_file(file_ext):
                return jsonify({"error": "Invalid file type. Allowed: .wav, .mp3, .m4a, .flac, .ogg"}), 400

            with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as temp_file:
                audio_file.save(temp_file.name)
                temp_path = temp_file.name
                needs_cleanup = True

        try:
            print(f"[CLONE ROUTE] Calling provider_registry.clone_voice()")
            voice_data = provider_registry.clone_voice(
                provider_id=provider,
                audio_file_path=temp_path,
                model=model
            )

            print(f"[CLONE ROUTE] Voice data type: {type(voice_data)}")
            if isinstance(voice_data, dict):
                print(f"[CLONE ROUTE] Voice data keys: {list(voice_data.keys())}")

            # Handle both string (voice_id) and dict (YTTS embeddings) return types
            if isinstance(voice_data, dict):
                # Complex provider (YTTS) - return the entire dict
                print(f"[CLONE ROUTE] Returning complex provider format (YTTS)")
                response_data = {
                    "success": True,
                    "message": "Voice cloned successfully",
                    "voices": {
                        provider: {
                            **voice_data,
                            "status": "ready",
                            "model": model
                        }
                    }
                }
            else:
                # Simple provider (ElevenLabs) - wrap voice_id string
                print(f"[CLONE ROUTE] Returning simple provider format (ElevenLabs)")
                response_data = {
                    "success": True,
                    "message": "Voice cloned successfully",
                    "voices": {
                        provider: {
                            "voice_id": voice_data,
                            "status": "ready",
                            "model": model
                        }
                    }
                }

            print(f"[CLONE ROUTE] Response voice data keys: {list(response_data['voices'][provider].keys())}")
            print(f"[CLONE ROUTE] ✓ Clone successful")
            print("="*80 + "\n")
            return jsonify(response_data), 200
        finally:
            if needs_cleanup and temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)

    except Exception as e:
        print(f"[CLONE ROUTE] ✗ Error in clone_voice: {e}")
        traceback.print_exc()
        print("="*80 + "\n")
        return jsonify({"error": f"Failed to clone voice: {str(e)}"}), 500


@tts_bp.route("/generate", methods=["POST"])
def generate_tts():
    """Generate TTS audio from text using cloned voices"""
    print("\n" + "="*80)
    print("[GENERATE ROUTE] Received generate request")
    try:
        data = request.get_json()
        if not data:
            print("[GENERATE ROUTE] ✗ No JSON data provided")
            return jsonify({"error": "No JSON data provided"}), 400

        text = data.get("text")
        voices = data.get("voices", {})
        provider = data.get("provider", "elevenlabs")
        settings = data.get("settings", {})

        print(f"[GENERATE ROUTE] Text: {text[:80]}..." if text else "[GENERATE ROUTE] Text: None")
        print(f"[GENERATE ROUTE] Provider: {provider}")
        print(f"[GENERATE ROUTE] Settings: {settings}")
        print(f"[GENERATE ROUTE] Voices keys: {list(voices.keys())}")
        print(f"[GENERATE ROUTE] Voice data for {provider}: {list(voices.get(provider, {}).keys())}")

        if not text:
            print("[GENERATE ROUTE] ✗ No text provided")
            return jsonify({"error": "No text provided"}), 400

        if not provider_registry.is_valid_provider(provider):
            print(f"[GENERATE ROUTE] ✗ Unknown provider: {provider}")
            return jsonify({"error": f"Unknown provider: {provider}"}), 400

        voice_data = voices.get(provider, {})
        if not voice_data:
            print(f"[GENERATE ROUTE] ✗ No voice data provided for {provider}")
            return jsonify({"error": f"No voice data provided for {provider}"}), 400

        print(f"[GENERATE ROUTE] Calling provider_registry.generate_speech()")
        # Pass entire voice_data dict - registry will handle extraction
        audio_path = provider_registry.generate_speech(
            provider_id=provider,
            text=text,
            voice_data=voice_data,
            settings=settings
        )
        print(f"[GENERATE ROUTE] Audio generated at: {audio_path}")

        response_data = {
            "success": True,
            "message": "Audio generated successfully",
            "audio": {
                "path": audio_path,
                "status": "ready",
                "provider": provider
            }
        }
        print(f"[GENERATE ROUTE] ✓ Success - returning response")
        print("="*80 + "\n")
        return jsonify(response_data), 200

    except Exception as e:
        print(f"[GENERATE ROUTE] ✗ Error in generate_tts: {e}")
        traceback.print_exc()
        print("="*80 + "\n")
        return jsonify({"error": f"Failed to generate audio: {str(e)}"}), 500


@tts_bp.route("/audio/<path:filename>", methods=["GET"])
def serve_audio(filename):
    """Serve generated audio files"""
    print(f"\n[SERVE AUDIO] Request for: {filename}")
    try:
        temp_dir = tempfile.gettempdir()
        audio_path = os.path.join(temp_dir, filename)

        print(f"[SERVE AUDIO] Looking for file at: {audio_path}")

        if not os.path.exists(audio_path):
            print(f"[SERVE AUDIO] ✗ Audio file not found at {audio_path}")
            return jsonify({"error": "Audio file not found"}), 404

        file_size = os.path.getsize(audio_path)
        print(f"[SERVE AUDIO] File exists, size: {file_size} bytes")

        if file_size == 0:
            print(f"[SERVE AUDIO] ✗ WARNING: Audio file is empty!")

        return send_file(audio_path, mimetype="audio/mpeg", as_attachment=False, download_name=filename)
    except Exception as e:
        print(f"[SERVE AUDIO] ✗ Error serving audio: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@tts_bp.route("/golden-set", methods=["GET"])
def list_golden_set():
    """List available golden set audio files from S3"""
    print(f"\n[GOLDEN SET] Listing files from S3")
    try:
        if not s3_client:
            return jsonify({"error": "S3 client not available"}), 500

        # List objects in S3 bucket with golden set prefix
        response = s3_client.list_objects_v2(
            Bucket=S3_BUCKET,
            Prefix=S3_GOLDEN_SET_PREFIX
        )

        files = []
        if 'Contents' in response:
            for obj in response['Contents']:
                key = obj['Key']
                # Skip the prefix itself (directory)
                if key == S3_GOLDEN_SET_PREFIX:
                    continue

                filename = key.replace(S3_GOLDEN_SET_PREFIX, '')
                # Only include .wav files
                if filename.endswith('.wav'):
                    files.append({
                        "name": filename,
                        "label": Path(filename).stem.replace("-", " ").title(),
                        "size": obj['Size']
                    })

        files.sort(key=lambda x: x['name'])
        print(f"[GOLDEN SET] Found {len(files)} files")
        return jsonify({"files": files}), 200

    except Exception as e:
        print(f"[GOLDEN SET] Error listing golden set: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@tts_bp.route("/golden-set/<filename>", methods=["GET"])
def serve_golden_set(filename):
    """Serve golden set audio files from S3"""
    print(f"\n[GOLDEN SET SERVE] Request for: {filename}")
    try:
        filename = secure_filename(filename)

        if not s3_client:
            return jsonify({"error": "S3 client not available"}), 500

        # Download from S3 to temp file
        s3_key = f"{S3_GOLDEN_SET_PREFIX}{filename}"
        print(f"[GOLDEN SET SERVE] Downloading s3://{S3_BUCKET}/{s3_key}")

        with tempfile.NamedTemporaryFile(suffix=Path(filename).suffix, delete=False) as tmp:
            try:
                s3_client.download_fileobj(S3_BUCKET, s3_key, tmp)
                temp_path = tmp.name
                print(f"[GOLDEN SET SERVE] Downloaded to {temp_path}")
            except Exception as e:
                print(f"[GOLDEN SET SERVE] Error: {e}")
                return jsonify({"error": "File not found"}), 404

        # Serve the file and clean up after
        try:
            return send_file(temp_path, mimetype="audio/wav", as_attachment=False, download_name=filename)
        finally:
            # Clean up temp file after sending
            try:
                os.unlink(temp_path)
            except:
                pass

    except Exception as e:
        print(f"[GOLDEN SET SERVE] Error: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
