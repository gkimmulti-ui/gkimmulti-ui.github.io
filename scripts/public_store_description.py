"""Keep developer contact addresses out of imported public catalog copy."""
import re

_HEADING = re.compile(r"(?m)^[ \t]*개발자[ \t]+연락처[ \t]*:[ \t]*\r?$")
_ADDRESS = re.compile(
    r"[^\r\n]+(?:길|로)[ \t]+\d+(?:-\d+)?[ \t]*\r?\n"
    r"[^\r\n]*\d+호[ \t]*\r?\n"
    r"[^\r\n,]+,[^\r\n]*\d{5}[ \t]*\r?\n"
)

def public_description(description):
    """Remove the address from the known terminal contact footer, preserving app copy."""
    matches = list(_HEADING.finditer(description))
    if not matches:
        return description
    if len(matches) != 1:
        raise ValueError("Unexpected developer contact format; review before publication.")
    start = description.find("\n", matches[0].end()) + 1
    if not start:
        raise ValueError("Incomplete developer contact footer; review before publication.")
    address = _ADDRESS.match(description, start)
    if not address:
        raise ValueError("Unexpected developer contact format; review before publication.")
    if len(description[address.end():].strip().splitlines()) > 1:
        raise ValueError("Unexpected developer contact footer length; review before publication.")
    return description[:start] + description[address.end():]
