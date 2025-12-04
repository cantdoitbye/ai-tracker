#!/usr/bin/env python3
"""
DNS Verification Checker
Helps debug domain verification issues
"""

import sys
import dns.resolver

def check_dns_txt(domain, expected_token=None):
    """Check DNS TXT records for a domain"""
    print(f"\n🔍 Checking DNS TXT records for: {domain}")
    print("=" * 60)
    
    try:
        # Create resolver
        resolver = dns.resolver.Resolver()
        resolver.cache = dns.resolver.Cache()
        
        # Query TXT records
        answers = resolver.resolve(domain, 'TXT')
        
        found_records = []
        for rdata in answers:
            for txt_string in rdata.strings:
                txt_decoded = txt_string.decode('utf-8') if isinstance(txt_string, bytes) else txt_string
                found_records.append(txt_decoded)
        
        if found_records:
            print(f"\n✅ Found {len(found_records)} TXT record(s):\n")
            for i, record in enumerate(found_records, 1):
                print(f"  {i}. {record}")
            
            # Check for verification token
            if expected_token:
                expected_record = f"aibot-detect={expected_token}"
                print(f"\n🔎 Looking for: {expected_record}")
                
                if expected_record in found_records:
                    print("✅ MATCH FOUND! Domain can be verified.")
                else:
                    print("❌ NO MATCH. Verification will fail.")
                    print("\nPossible issues:")
                    print("  - Token is incorrect")
                    print("  - DNS record not propagated yet")
                    print("  - Extra spaces in DNS record")
        else:
            print("❌ No TXT records found")
            print("\nPossible issues:")
            print("  - DNS record not added yet")
            print("  - DNS not propagated yet (wait 10-30 minutes)")
            print("  - Wrong record type (must be TXT)")
        
    except dns.resolver.NXDOMAIN:
        print(f"❌ Domain '{domain}' does not exist")
        print("\nPossible issues:")
        print("  - Domain name misspelled")
        print("  - Domain not registered")
        
    except dns.resolver.NoAnswer:
        print("❌ No TXT records found for this domain")
        print("\nPossible issues:")
        print("  - DNS record not added yet")
        print("  - DNS not propagated yet")
        
    except dns.resolver.Timeout:
        print("❌ DNS query timed out")
        print("\nPossible issues:")
        print("  - DNS server issues")
        print("  - Network connectivity problems")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n" + "=" * 60)

def check_multiple_dns_servers(domain):
    """Check DNS from multiple public DNS servers"""
    print(f"\n🌐 Checking DNS propagation across multiple servers")
    print("=" * 60)
    
    dns_servers = {
        "Google": "8.8.8.8",
        "Cloudflare": "1.1.1.1",
        "Quad9": "9.9.9.9",
        "OpenDNS": "208.67.222.222"
    }
    
    for name, server in dns_servers.items():
        print(f"\n📡 {name} DNS ({server}):")
        try:
            resolver = dns.resolver.Resolver()
            resolver.nameservers = [server]
            resolver.cache = dns.resolver.Cache()
            
            answers = resolver.resolve(domain, 'TXT')
            records = []
            for rdata in answers:
                for txt_string in rdata.strings:
                    txt_decoded = txt_string.decode('utf-8') if isinstance(txt_string, bytes) else txt_string
                    if 'aibot-detect' in txt_decoded:
                        records.append(txt_decoded)
            
            if records:
                print(f"  ✅ Found: {records[0]}")
            else:
                print("  ❌ No aibot-detect record found")
                
        except dns.resolver.NXDOMAIN:
            print("  ❌ Domain not found")
        except dns.resolver.NoAnswer:
            print("  ❌ No TXT records")
        except Exception as e:
            print(f"  ❌ Error: {e}")
    
    print("\n" + "=" * 60)

def main():
    if len(sys.argv) < 2:
        print("Usage: python check_dns.py <domain> [verification_token]")
        print("\nExamples:")
        print("  python check_dns.py aitracker.in")
        print("  python check_dns.py aitracker.in abc123xyz789")
        sys.exit(1)
    
    domain = sys.argv[1]
    token = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Check DNS
    check_dns_txt(domain, token)
    
    # Check propagation
    if token:
        check_multiple_dns_servers(domain)
    
    print("\n💡 Tips:")
    print("  - DNS changes can take 10 minutes to 48 hours to propagate")
    print("  - Use https://dnschecker.org/ to check global propagation")
    print("  - Ensure TXT record format is: aibot-detect=YOUR_TOKEN")
    print("  - No quotes, no extra spaces")
    print()

if __name__ == "__main__":
    main()
