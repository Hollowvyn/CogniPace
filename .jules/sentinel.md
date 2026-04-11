## 2024-05-24 - [Fix Reverse Tabnabbing]
**Vulnerability:** window.open using target=_blank without noopener/noreferrer
**Learning:** Found an instance in extensionNavigationRepository where target=_blank was used. When using window.open with target='_blank', it leaves the opener reference vulnerable to malicious modification.
**Prevention:** Always include 'noopener,noreferrer' as the third argument to window.open calls.
