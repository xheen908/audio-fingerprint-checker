#pragma once
#include <string>
#include <stdint.h>
#include <vector>

namespace HMAC_SHA1 {
    
    class SHA1 {
    public:
        SHA1();
        void update(const std::string &s);
        void update(std::istream &is);
        std::string final();
        static std::string from_file(const std::string &filename);

    private:
        uint32_t digest[5];
        std::string buffer;
        uint64_t transforms;
    };

    std::string hmac_sha1(const std::string& key, const std::string& msg);
}
