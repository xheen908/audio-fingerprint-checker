#pragma once

#include <JuceHeader.h>
#include "PluginProcessor.h"

class AnalysisThread : public juce::Thread
{
public:
    AnalysisThread(AudioFingerprintCheckerAudioProcessor& p);
    ~AnalysisThread() override;

    void run() override;
    
    // Will be called by IPC from React
    void setRecording(bool shouldRecord);
    void setApiKeys(const juce::String& auddKey, const juce::String& acrKey, const juce::String& acrSecret, const juce::String& acrHost);

private:
    void sendAudioToAPI(const juce::MemoryBlock& wavData);

    AudioFingerprintCheckerAudioProcessor& processor;
    bool isRecording = false;
    juce::String auddApiKey;
    juce::String acrAccessKey;
    juce::String acrAccessSecret;
    juce::String acrHost;
};
