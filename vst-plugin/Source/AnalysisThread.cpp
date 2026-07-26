#include "AnalysisThread.h"
#include "PluginProcessor.h"
#include "PluginEditor.h"

AnalysisThread::AnalysisThread(AudioFingerprintCheckerAudioProcessor& p)
    : Thread("AnalysisThread"), processor(p)
{
    startThread();
}

AnalysisThread::~AnalysisThread()
{
    stopThread(4000);
}

void AnalysisThread::setRecording(bool shouldRecord)
{
    if (shouldRecord && !isRecording) {
        // Reset session when starting to record
        processor.ringBuffer.clear();
        processor.writePosition = 0;
    }
    isRecording = shouldRecord;
    processor.isRecording = shouldRecord;
}

void AnalysisThread::setApiKeys(const juce::String& auddKey, const juce::String& acrKey, const juce::String& acrSecret, const juce::String& acrHost)
{
    auddApiKey = auddKey;
    acrAccessKey = acrKey;
    this->acrAccessSecret = acrSecret;
    this->acrHost = acrHost;
}

void AnalysisThread::run()
{
    while (!threadShouldExit())
    {
        // Wait 6 seconds between analysis attempts if recording, else sleep shortly
        if (isRecording) {
            wait(6000);
            
            if (threadShouldExit() || !isRecording) continue; // <-- FIX: continue instead of break!

            // 1. Copy the ring buffer to avoid locking the audio thread
            juce::AudioBuffer<float> bufferCopy;
            bufferCopy.makeCopyOf(processor.ringBuffer);

            // 2. Encode to WAV in memory correctly
            juce::MemoryBlock wavMemory;
            auto* stream = new juce::MemoryOutputStream(wavMemory, false); // Writer takes ownership
            juce::WavAudioFormat wavFormat;
            
            double sr = processor.getSampleRate() > 0 ? processor.getSampleRate() : 44100.0;
            int ch = bufferCopy.getNumChannels() > 0 ? bufferCopy.getNumChannels() : 2;
            
            // Disable deprecation warning for the old createWriterFor
JUCE_BEGIN_IGNORE_WARNINGS_GCC_LIKE("-Wdeprecated-declarations")
            std::unique_ptr<juce::AudioFormatWriter> writer(
                wavFormat.createWriterFor(stream, sr, ch, 16, juce::StringPairArray(), 0)
            );
JUCE_END_IGNORE_WARNINGS_GCC_LIKE

            if (writer != nullptr) {
                writer->writeFromAudioSampleBuffer(bufferCopy, 0, bufferCopy.getNumSamples());
                writer.reset(); // Deletes writer and stream, flushes WAV header
                
                // 3. Send to API
                sendAudioToAPI(wavMemory);
            }
        } else {
            wait(500);
        }
    }
}

#include "hmac_sha1.h"

void AnalysisThread::sendAudioToAPI(const juce::MemoryBlock& wavData)
{
    juce::File logFile = juce::File::getSpecialLocation(juce::File::userDesktopDirectory).getChildFile("Audd4live_VST_Log.txt");
    juce::String auddResult = "null";
    juce::String acrResult = "null";

    // 1. Audd.io Request
    if (auddApiKey.isNotEmpty()) {
        juce::URL url("https://api.audd.io/");
        url = url.withParameter("api_token", auddApiKey);
        
        juce::String boundary = "----AuddBoundary" + juce::String(juce::Random::getSystemRandom().nextInt());
        juce::MemoryBlock postData;
        juce::MemoryOutputStream out(postData, false);
        
        out << "--" << boundary << "\r\n"
            << "Content-Disposition: form-data; name=\"file\"; filename=\"audio.wav\"\r\n"
            << "Content-Type: audio/wav\r\n\r\n";
        out.write(wavData.getData(), wavData.getSize());
        out << "\r\n--" << boundary << "--\r\n";
        url = url.withPOSTData(postData);
        
        juce::StringArray headers;
        headers.add("Content-Type: multipart/form-data; boundary=" + boundary);
        
        auto stream = url.createInputStream(juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inAddress)
                                                .withExtraHeaders(headers.joinIntoString("\r\n"))
                                                .withConnectionTimeoutMs(10000));
        
        if (stream != nullptr) {
            auddResult = stream->readEntireStreamAsString();
        } else {
            auddResult = "{\"status\":\"error\", \"error\": {\"error_message\":\"Connection failed\"}}";
        }
    }

    // 2. ACRCloud Request
    if (acrAccessKey.isNotEmpty() && acrAccessSecret.isNotEmpty() && acrHost.isNotEmpty()) {
        juce::URL url("https://" + acrHost + "/v1/identify");
        
        juce::String timestamp = juce::String(juce::Time::currentTimeMillis() / 1000);
        juce::String stringToSign = "POST\n/v1/identify\n" + acrAccessKey + "\naudio\n1\n" + timestamp;
        
        std::string hmac = HMAC_SHA1::hmac_sha1(acrAccessSecret.toStdString(), stringToSign.toStdString());
        juce::String signature = juce::Base64::toBase64(hmac.data(), hmac.length());
        
        juce::String boundary = "----ACRBoundary" + juce::String(juce::Random::getSystemRandom().nextInt());
        juce::MemoryBlock postData;
        juce::MemoryOutputStream out(postData, false);
        
        auto addField = [&out, &boundary](const juce::String& name, const juce::String& value) {
            out << "--" << boundary << "\r\n"
                << "Content-Disposition: form-data; name=\"" << name << "\"\r\n\r\n"
                << value << "\r\n";
        };
        
        addField("access_key", acrAccessKey);
        addField("sample_bytes", juce::String((int)wavData.getSize()));
        addField("timestamp", timestamp);
        addField("signature", signature);
        addField("data_type", "audio");
        addField("signature_version", "1");
        
        out << "--" << boundary << "\r\n"
            << "Content-Disposition: form-data; name=\"sample\"; filename=\"sample.wav\"\r\n"
            << "Content-Type: audio/wav\r\n\r\n";
        out.write(wavData.getData(), wavData.getSize());
        out << "\r\n--" << boundary << "--\r\n";
        
        url = url.withPOSTData(postData);
        juce::StringArray headers;
        headers.add("Content-Type: multipart/form-data; boundary=" + boundary);
        
        auto stream = url.createInputStream(juce::URL::InputStreamOptions(juce::URL::ParameterHandling::inAddress)
                                                .withExtraHeaders(headers.joinIntoString("\r\n"))
                                                .withConnectionTimeoutMs(10000));
        
        if (stream != nullptr) {
            acrResult = stream->readEntireStreamAsString();
        } else {
            acrResult = "{\"status\":{\"msg\":\"Connection failed\"}}";
        }
    }
    
    // Combine and send
    juce::String combinedResult = "{\"audd\": " + auddResult + ", \"acrcloud\": " + acrResult + "}";
    juce::String jsCode = "if (window.onVstResultReceived) { window.onVstResultReceived(" + combinedResult + "); }";
    
    logFile.appendText("JS Code: " + jsCode + "\n");
    
    juce::MessageManager::callAsync([this, jsCode, logFile]() {
        if (auto* editor = processor.getActiveEditor()) {
            if (auto* myEditor = dynamic_cast<PluginEditor*>(editor)) {
                myEditor->evaluateJS(jsCode);
            }
        }
    });
}
