import { useState } from 'react';
import AudioUpload from './components/AudioUpload';
import TextEntry from './components/TextEntry';
import DualServicePanel from './components/DualServicePanel';
import DualComparisonView from './components/DualComparisonView';
import Section from './components/Section';
import { useTTSGeneration } from './hooks/useTTSGeneration';
import { getDefaultSettings, getModelsForProvider } from './utils/modelHelpers';
import { ProviderId, ReferenceAudioData, VoiceCache, VoiceData, Settings } from './types';
import './App.css';
import './components/components.css';

function App() {
  // Reference audio state
  const [referenceAudio, setReferenceAudio] = useState<ReferenceAudioData | null>(null);
  const [text, setText] = useState<string>('');

  // Provider and model state for each service
  const [provider1, setProvider1] = useState<ProviderId>('ytts');
  const [provider2, setProvider2] = useState<ProviderId>('ytts');
  const [model1, setModel1] = useState<string>('ytts_v1.0.2');
  const [model2, setModel2] = useState<string>('ytts_v1.1.0');

  // Voice cache: { [refAudioId]: { [provider]: { [model]: voiceData } } }
  const [voiceCache, setVoiceCache] = useState<VoiceCache>({});

  // Cloning state for each service
  const [isCloning1, setIsCloning1] = useState<boolean>(false);
  const [isCloning2, setIsCloning2] = useState<boolean>(false);
  const [cloneError1, setCloneError1] = useState<string | null>(null);
  const [cloneError2, setCloneError2] = useState<string | null>(null);

  // Settings state
  const [settings1, setSettings1] = useState<Settings | null>(null);
  const [settings2, setSettings2] = useState<Settings | null>(null);

  // TTS generation hook
  const { isGenerating, audioData, generateAudio } = useTTSGeneration();

  // Helper: Get cache key for reference audio
  const getRefAudioKey = (): string | null => {
    if (!referenceAudio) return null;
    // Use file name or a hash as the key
    if ('name' in referenceAudio.file) {
      return referenceAudio.file.name || referenceAudio.filename || 'default';
    }
    return referenceAudio.filename || 'default';
  };

  // Helper: Check if voice is cloned for given provider/model
  const isVoiceCloned = (provider: ProviderId, model: string): boolean => {
    const refKey = getRefAudioKey();
    if (!refKey) return false;
    return !!(voiceCache[refKey]?.[provider]?.[model]);
  };

  // Helper: Get cloned voice for given provider/model
  const getClonedVoice = (provider: ProviderId, model: string): VoiceData | null => {
    const refKey = getRefAudioKey();
    if (!refKey) return null;
    return voiceCache[refKey]?.[provider]?.[model] || null;
  };

  // Helper: Check if voice needs recloning due to changes
  const needsRecloning = (provider: ProviderId, model: string, currentSettings: Settings | null): boolean => {
    const voice = getClonedVoice(provider, model);
    if (!voice) return false;

    const refKey = getRefAudioKey();

    // Check if reference audio changed
    if (voice.clonedWithRefAudioKey !== refKey) {
      return true;
    }

    // Check if text/script changed
    if (voice.clonedWithText !== text) {
      return true;
    }

    // Check if settings changed
    if (currentSettings && voice.clonedWithSettings) {
      if (JSON.stringify(currentSettings) !== JSON.stringify(voice.clonedWithSettings)) {
        return true;
      }
    }

    return false;
  };

  // Handlers
  const handleAudioUploaded = (data: ReferenceAudioData | null) => {
    setReferenceAudio(data);
  };

  const handleClone = async (service: number, provider: ProviderId, model: string) => {
    if (!referenceAudio) return;

    const setCloning = service === 1 ? setIsCloning1 : setIsCloning2;
    const setError = service === 1 ? setCloneError1 : setCloneError2;

    setCloning(true);
    setError(null);

    try {
      let response: Response;
      let data: any;

      if (referenceAudio.isGoldenSet) {
        response = await fetch('/api/tts/clone-voice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider,
            model,
            filename: referenceAudio.goldenSetFilename,
          }),
        });
      } else {
        const formData = new FormData();
        formData.append('audio', referenceAudio.file as File);
        formData.append('provider', provider);
        formData.append('model', model);

        response = await fetch('/api/tts/clone-voice', {
          method: 'POST',
          body: formData,
        });
      }

      // Check if response has content before parsing JSON
      const contentType = response.headers.get('content-type');
      console.log('Clone response status:', response.status);
      console.log('Clone response content-type:', contentType);

      const responseText = await response.text();
      console.log('Clone response text:', responseText);

      if (!responseText) {
        throw new Error('Empty response from server');
      }

      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
      }

      console.log('Clone response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clone voice');
      }

      const refKey = getRefAudioKey();
      if (!refKey) return;

      const voiceData = data.voices[provider];
      console.log('Voice data to cache:', voiceData);
      console.log('Voice data keys:', Object.keys(voiceData));

      setVoiceCache(prev => ({
        ...prev,
        [refKey]: {
          ...prev[refKey],
          [provider]: {
            ...(prev[refKey]?.[provider] || {}),
            [model]: {
              ...voiceData,
              clonedWithFile: referenceAudio.filename,
            },
          },
        },
      }));
    } catch (error) {
      console.error('Clone error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setCloning(false);
    }
  };

  const handleClone1 = () => handleClone(1, provider1, model1);
  const handleClone2 = () => handleClone(2, provider2, model2);

  const handleProvider1Change = (newProvider: ProviderId) => {
    setProvider1(newProvider);
    const models = getModelsForProvider(newProvider);
    if (models.length > 0) {
      setModel1(models[0].value);
    }
  };

  const handleProvider2Change = (newProvider: ProviderId) => {
    setProvider2(newProvider);
    const models = getModelsForProvider(newProvider);
    if (models.length > 0) {
      setModel2(models[0].value);
    }
  };

  const handleGenerate = (service: 'service1' | 'service2' | 'both') => {
    // Get voices from cache
    const voice1 = getClonedVoice(provider1, model1);
    const voice2 = getClonedVoice(provider2, model2);

    // Filter out null values
    const voices: { [key: string]: VoiceData } = {};
    if (voice1) voices[provider1] = voice1;
    if (voice2) voices[provider2] = voice2;

    generateAudio(service, {
      text,
      voices,
      settings1: settings1 || getDefaultSettings(provider1),
      settings2: settings2 || getDefaultSettings(provider2),
      provider1,
      provider2,
    });
  };

  // Computed states
  const isStep1Complete = !!referenceAudio;
  const isStep2Complete = !!text.trim();
  const isVoice1Cloned = isVoiceCloned(provider1, model1);
  const isVoice2Cloned = isVoiceCloned(provider2, model2);
  const canConfigureSettings = isStep1Complete && isStep2Complete;
  const canGenerate1 = canConfigureSettings && isVoice1Cloned;
  const canGenerate2 = canConfigureSettings && isVoice2Cloned;

  return (
    <div className="app-container">
      <main className="main-content">
        {/* Step 1: Upload Reference Audio */}
        <Section
          stepNumber={1}
          title="Choose Reference Audio"
          description="Upload audio to use as reference for voice cloning."
          isComplete={isStep1Complete}
          isDisabled={false}
        >
          <AudioUpload onAudioUploaded={handleAudioUploaded} disabled={false} />
        </Section>

        {/* Step 2: Set Text */}
        <Section
          stepNumber={2}
          title="Set Script"
          description="Enter the text you want to synthesize."
          isComplete={isStep2Complete}
          isDisabled={!isStep1Complete}
        >
          <TextEntry onTextChange={setText} disabled={!referenceAudio} />
        </Section>

        {/* Step 3: Configure Services & Generate */}
        <Section
          stepNumber={3}
          title="Configure Services & Generate"
          description="Select the provider and model, clone the voice, adjust settings, and generate audio for service."
          isComplete={false}
          isDisabled={!canConfigureSettings}
          isHighlighted={!!(audioData?.service1 && audioData?.service2)}
        >
          <DualServicePanel
            provider1={provider1}
            provider2={provider2}
            model1={model1}
            model2={model2}
            onProvider1Change={handleProvider1Change}
            onProvider2Change={handleProvider2Change}
            onModel1Change={setModel1}
            onModel2Change={setModel2}
            onClone1={handleClone1}
            onClone2={handleClone2}
            isCloning1={isCloning1}
            isCloning2={isCloning2}
            isCloned1={isVoice1Cloned}
            isCloned2={isVoice2Cloned}
            cloneError1={cloneError1}
            cloneError2={cloneError2}
            onSettings1Change={setSettings1}
            onSettings2Change={setSettings2}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            canGenerate1={canGenerate1}
            canGenerate2={canGenerate2}
            disabled={!canConfigureSettings}
          />
        </Section>

        {/* Step 4: Compare Results */}
        <Section
          stepNumber={4}
          title="Compare Results"
          description="Listen to the generated audio from both services."
          isComplete={false}
          isDisabled={!canConfigureSettings}
        >
          <DualComparisonView
            audioData={audioData}
            provider1={provider1}
            provider2={provider2}
            model1={model1}
            model2={model2}
          />
        </Section>
      </main>
    </div>
  );
}

export default App;
