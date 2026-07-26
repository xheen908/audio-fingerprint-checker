#include "PluginProcessor.h"
#include "PluginEditor.h"
#include "AnalysisThread.h"

CustomWebBrowserComponent::CustomWebBrowserComponent(PluginEditor& editorRef)
    : editor(editorRef)
{
}

bool CustomWebBrowserComponent::pageAboutToLoad(const juce::String& newURL)
{
    if (newURL.startsWithIgnoreCase("juce://")) {
        editor.handleJuceUrl(newURL);
        return false; // Intercept and block navigation
    }
    return true; // Let other URLs load
}

PluginEditor::PluginEditor (AudioFingerprintCheckerAudioProcessor& p)
    : AudioProcessorEditor (&p), audioProcessor (p), webComponent (*this),
      forwardFFT (AudioFingerprintCheckerAudioProcessor::fftOrder),
      window (AudioFingerprintCheckerAudioProcessor::fftSize, juce::dsp::WindowingFunction<float>::hann)
{
    // Make sure that before the constructor has finished, you've set the
    // editor's size to whatever you need it to be.
    setSize (800, 600);

    addAndMakeVisible(webComponent);
    
    // For development, load the Vite dev server. 
    // For production, this would load the local dist/index.html
    webComponent.goToURL("http://localhost:5173");
    
    // Start timer at 30Hz (~33ms) to push RMS levels to the UI
    startTimer(33);
}

PluginEditor::~PluginEditor()
{
    stopTimer();
}

void PluginEditor::timerCallback()
{
    // Process FFT if ready
    if (audioProcessor.nextFFTBlockReady)
    {
        // Apply windowing function
        window.multiplyWithWindowingTable (audioProcessor.fftData.data(), AudioFingerprintCheckerAudioProcessor::fftSize);

        // Perform FFT
        forwardFFT.performFrequencyOnlyForwardTransform (audioProcessor.fftData.data());

        // Extract bands (we only need the first half, up to Nyquist)
        // Let's send 32 bands to keep the JSON payload small
        int numBands = 32;
        juce::String jsArray = "[";
        
        // Size of each band
        int binsPerBand = (AudioFingerprintCheckerAudioProcessor::fftSize / 2) / numBands;
        
        for (int i = 0; i < numBands; ++i)
        {
            float bandLevel = 0.0f;
            for (int j = 0; j < binsPerBand; ++j) {
                float binVal = audioProcessor.fftData[(size_t)(i * binsPerBand + j)];
                if (binVal > bandLevel) bandLevel = binVal; // Peak
            }
            
            // Map magnitude to a 0.0 - 1.0 range approx
            // Use log mapping for better visualization
            bandLevel = juce::Decibels::gainToDecibels(bandLevel) / 100.0f + 1.0f;
            if (bandLevel < 0.0f) bandLevel = 0.0f;
            if (bandLevel > 1.0f) bandLevel = 1.0f;
            
            jsArray += juce::String(bandLevel);
            if (i < numBands - 1) jsArray += ",";
        }
        jsArray += "]";

        juce::String jsCode = "if (window.updateSpectrum) window.updateSpectrum(" + jsArray + ");";
        evaluateJS(jsCode);
        
        audioProcessor.nextFFTBlockReady = false;
    }
    
    // Fallback/Legacy Level update
    float level = audioProcessor.currentRmsLevel;
    juce::String jsLevelCode = "if (window.updateAudioLevel) window.updateAudioLevel(" + juce::String(level) + ");";
    evaluateJS(jsLevelCode);
}

void PluginEditor::evaluateJS(const juce::String& js)
{
    webComponent.evaluateJavascript(js);
}

void PluginEditor::handleJuceUrl(const juce::String& url)
{
    if (url.startsWithIgnoreCase("juce://setRecording")) {
        bool shouldRecord = url.containsIgnoreCase("state=true");
        if (audioProcessor.analysisThread != nullptr) {
            audioProcessor.analysisThread->setRecording(shouldRecord);
        }
    } else if (url.startsWithIgnoreCase("juce://setApiKeys")) {
        auto getParam = [&url](const juce::String& name) -> juce::String {
            int start = url.indexOf(name + "=");
            if (start < 0) return "";
            start += name.length() + 1;
            int end = url.indexOfChar(start, '&');
            if (end < 0) end = url.length();
            return juce::URL::removeEscapeChars(url.substring(start, end));
        };
        
        juce::String audd = getParam("audd");
        juce::String acr = getParam("acr");
        juce::String sec = getParam("sec");
        juce::String host = getParam("host");
        
        if (audioProcessor.analysisThread != nullptr) {
            audioProcessor.analysisThread->setApiKeys(audd, acr, sec, host);
        }
    }
}

void PluginEditor::paint (juce::Graphics& g)
{
    g.fillAll (getLookAndFeel().findColour (juce::ResizableWindow::backgroundColourId));
}

void PluginEditor::resized()
{
    webComponent.setBounds(getLocalBounds());
}
