#pragma once

#include <JuceHeader.h>

class AnalysisThread;

class AudioFingerprintCheckerAudioProcessor  : public juce::AudioProcessor
{
public:
    AudioFingerprintCheckerAudioProcessor();
    ~AudioFingerprintCheckerAudioProcessor() override;

    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    bool isBusesLayoutSupported (const BusesLayout& layouts) const override;
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return JucePlugin_Name; }
    bool acceptsMidi() const override { return false; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int index) override {}
    const juce::String getProgramName (int index) override { return {}; }
    void changeProgramName (int index, const juce::String& newName) override {}
    void getStateInformation (juce::MemoryBlock& destData) override {}
    void setStateInformation (const void* data, int sizeInBytes) override {}

    //    // --- FFT / Spectrum FIFO ---
    static constexpr auto fftOrder = 9; // 512 samples
    static constexpr auto fftSize  = 1 << fftOrder;
    
    std::array<float, fftSize> fifo;
    std::array<float, fftSize * 2> fftData;
    int fifoIndex = 0;
    bool nextFFTBlockReady = false;
    
    void pushNextSampleIntoFifo (float sample) noexcept;
    
    // --- Audio Buffer for API ---
    juce::AudioBuffer<float> ringBuffer;
    int writePosition = 0;
    bool isRecording = false; // Toggled by UI
    float currentRmsLevel = 0.0f; // Audio Level for UI

    std::unique_ptr<AnalysisThread> analysisThread;

private:
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (AudioFingerprintCheckerAudioProcessor)
};
