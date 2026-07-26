#pragma once

#include <JuceHeader.h>
#include "PluginProcessor.h"

class PluginEditor;

class CustomWebBrowserComponent : public juce::WebBrowserComponent
{
public:
    CustomWebBrowserComponent(PluginEditor& editorRef);
    bool pageAboutToLoad(const juce::String& newURL) override;
private:
    PluginEditor& editor;
};

class PluginEditor  : public juce::AudioProcessorEditor, public juce::Timer
{
public:
    PluginEditor (AudioFingerprintCheckerAudioProcessor&);
    ~PluginEditor() override;

    void paint (juce::Graphics&) override;
    void resized() override;
    
    // Called periodically to push RMS to React UI
    void timerCallback() override;
    
    // Evaluate Javascript in the WebView
    void evaluateJS(const juce::String& js);
    
    // Called by CustomWebBrowserComponent
    void handleJuceUrl(const juce::String& url);

private:
    AudioFingerprintCheckerAudioProcessor& audioProcessor;
    CustomWebBrowserComponent webComponent;
    
    // FFT
    juce::dsp::FFT forwardFFT;
    juce::dsp::WindowingFunction<float> window;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (PluginEditor)
};
