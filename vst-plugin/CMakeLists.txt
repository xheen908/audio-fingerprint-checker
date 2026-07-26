cmake_minimum_required(VERSION 3.22)
project(AudioFingerprintChecker VERSION 1.2.0)

# Include JUCE
add_subdirectory(JUCE)

# Set up the JUCE plugin
juce_add_plugin(AudioFingerprintChecker
    COMPANY_NAME "Xheen"
    IS_SYNTH FALSE
    NEEDS_MIDI_INPUT FALSE
    NEEDS_MIDI_OUTPUT FALSE
    IS_MIDI_EFFECT FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS TRUE
    COPY_PLUGIN_AFTER_BUILD TRUE
    PLUGIN_MANUFACTURER_CODE Xhen
    PLUGIN_CODE Aufp
    FORMATS AU VST3 Standalone
    PRODUCT_NAME "Audio Fingerprint Checker"
    VERSION 1.2.0)

# Add source files
target_sources(AudioFingerprintChecker
    PRIVATE
        Source/PluginProcessor.cpp
        Source/PluginProcessor.h
        Source/PluginEditor.cpp
        Source/PluginEditor.h
        Source/AnalysisThread.cpp
        Source/AnalysisThread.h
        Source/hmac_sha1.cpp)

juce_generate_juce_header(AudioFingerprintChecker)

target_compile_definitions(AudioFingerprintChecker
    PUBLIC
        JUCE_WEB_BROWSER=1
        JUCE_USE_CURL=1
        JUCE_VST3_CAN_REPLACE_VST2=0)

target_compile_features(AudioFingerprintChecker PRIVATE cxx_std_20)

# Link to JUCE modules
target_link_libraries(AudioFingerprintChecker
    PRIVATE
        juce::juce_audio_utils
        juce::juce_gui_extra
        juce::juce_gui_basics
        juce::juce_audio_processors
        juce::juce_core
        juce::juce_data_structures
        juce::juce_events
        juce::juce_graphics
        juce::juce_dsp)
