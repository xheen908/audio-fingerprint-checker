#include "PluginProcessor.h"
#include "PluginEditor.h"
#include "AnalysisThread.h"

AudioFingerprintCheckerAudioProcessor::AudioFingerprintCheckerAudioProcessor()
#ifndef JucePlugin_PreferredChannelConfigurations
     : AudioProcessor (BusesProperties()
                     #if ! JucePlugin_IsMidiEffect
                      #if ! JucePlugin_IsSynth
                       .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                      #endif
                       .withOutput ("Output", juce::AudioChannelSet::stereo(), true)
                     #endif
                       )
#endif
{
    analysisThread = std::make_unique<AnalysisThread>(*this);
}

AudioFingerprintCheckerAudioProcessor::~AudioFingerprintCheckerAudioProcessor()
{
}

bool AudioFingerprintCheckerAudioProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
  #if JucePlugin_IsMidiEffect
    juce::ignoreUnused (layouts);
    return true;
  #else
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::mono()
     && layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

   #if ! JucePlugin_IsSynth
    if (layouts.getMainOutputChannelSet() != layouts.getMainInputChannelSet())
        return false;
   #endif
    return true;
  #endif
}

void AudioFingerprintCheckerAudioProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    // Initialize ring buffer to hold 6 seconds of audio (optimized for faster API response)
    int bufferSize = (int)(sampleRate * 6.0);
    ringBuffer.setSize(getTotalNumInputChannels(), bufferSize);
    ringBuffer.clear();
    writePosition = 0;
    
    // Reset FIFO
    fifoIndex = 0;
    nextFFTBlockReady = false;
    std::fill(fifo.begin(), fifo.end(), 0.0f);
    std::fill(fftData.begin(), fftData.end(), 0.0f);
}

void AudioFingerprintCheckerAudioProcessor::releaseResources()
{
}

void AudioFingerprintCheckerAudioProcessor::pushNextSampleIntoFifo (float sample) noexcept
{
    // if the fifo contains enough data, set a flag to say
    // that the next frame should now be rendered..
    if (fifoIndex == fftSize)
    {
        if (! nextFFTBlockReady)
        {
            std::fill (fftData.begin(), fftData.end(), 0.0f);
            std::copy (fifo.begin(), fifo.end(), fftData.begin());
            nextFFTBlockReady = true;
        }

        fifoIndex = 0;
    }

    fifo[(size_t) fifoIndex++] = sample;
}

void AudioFingerprintCheckerAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    juce::ScopedNoDenormals noDenormals;
    auto totalNumInputChannels  = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    // Clear outputs that don't contain input data
    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear (i, 0, buffer.getNumSamples());

    // Calculate RMS Level for UI
    float maxRms = 0.0f;
    for (int channel = 0; channel < totalNumInputChannels; ++channel) {
        float rms = buffer.getRMSLevel(channel, 0, buffer.getNumSamples());
        if (rms > maxRms) maxRms = rms;
    }
    currentRmsLevel = maxRms;
    
    // Feed FFT FIFO (using average of all channels for spectrum)
    const float* channelDataL = buffer.getReadPointer(0);
    const float* channelDataR = totalNumInputChannels > 1 ? buffer.getReadPointer(1) : nullptr;
    
    for (int i = 0; i < buffer.getNumSamples(); ++i) {
        float sample = channelDataR != nullptr ? (channelDataL[i] + channelDataR[i]) * 0.5f : channelDataL[i];
        pushNextSampleIntoFifo(sample);
    }

    if (isRecording) {
        int bufferLength = ringBuffer.getNumSamples();
        int numSamples = buffer.getNumSamples();
        
        for (int channel = 0; channel < totalNumInputChannels; ++channel)
        {
            auto* channelData = buffer.getReadPointer(channel);
            auto* ringData = ringBuffer.getWritePointer(channel);
            
            for (int i = 0; i < numSamples; ++i) {
                ringData[(writePosition + i) % bufferLength] = channelData[i];
            }
        }
        writePosition = (writePosition + numSamples) % bufferLength;
    }
}

juce::AudioProcessorEditor* AudioFingerprintCheckerAudioProcessor::createEditor()
{
    return new PluginEditor (*this);
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new AudioFingerprintCheckerAudioProcessor();
}
