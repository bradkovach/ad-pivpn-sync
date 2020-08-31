# Active Directory -> PiVPN Sync Tool

This tool can be used to synchronize an Active Directory group with PiVPN.

# Install

`npm install @bradkovach/ad-pivpn-sync`

# Usage

The tool is designed to take its configuration from the command line arguments.

For full documentation, run the tool with `--help`

```bash
npx nodemon dist/index.js --controller "ldap://ad.contoso.local" \
    --dn "dc=contoso,dc=local" \
    --username "contoso\admin" \
    --password "Pass@word123!" \
    --group "VPN Users" \
    --ovpns ~/ovpns
```