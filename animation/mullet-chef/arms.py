"""Two-bone arms (upper arm + forearm) with IK, angle poses and smoothed blending.

Coordinates are character-local: x forward (in facing direction), y down, origin at the feet.
Angles use the rig convention: 0 = hanging straight down, negative = swung forward;
a bone of length L at angle a ends at (-sin a * L, cos a * L).
"""
import math


def bone_end(x, y, a, L):
    r = math.radians(a)
    return x - math.sin(r) * L, y + math.cos(r) * L


def vec_angle(vx, vy):
    return math.degrees(math.atan2(-vx, vy))


def ik(sx, sy, tx, ty, L1, L2):
    """Return (upper, fore) angles so the hand reaches (tx, ty); elbow bends downward."""
    dx, dy = tx - sx, ty - sy
    D = max(abs(L1 - L2) + 1e-3, min(L1 + L2 - 1e-3, math.hypot(dx, dy)))
    base = math.atan2(dy, dx)
    A = math.acos(max(-1, min(1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))))
    best = None
    for sgn in (1, -1):
        ex, ey = sx + L1 * math.cos(base + sgn * A), sy + L1 * math.sin(base + sgn * A)
        if best is None or ey > best[1]:
            best = (ex, ey)
    ex, ey = best
    hx, hy = sx + D * math.cos(base), sy + D * math.sin(base)
    return vec_angle(ex - sx, ey - sy), vec_angle(hx - ex, hy - ey)


def _wrap(d):
    return (d + 180) % 360 - 180


class ArmBlender:
    """Eases between the walk swing and posed angles; frames must be sampled in order."""

    def __init__(self, rate=0.26):
        self.rate, self.state = rate, {}

    def __call__(self, key, walk, pose):
        st = self.state.setdefault(key, {"w": 0.0, "ov": list(pose or walk)})
        a = self.rate
        if pose is not None:
            for i in range(2):
                st["ov"][i] += _wrap(pose[i] - st["ov"][i]) * a
        st["w"] += ((1.0 if pose is not None else 0.0) - st["w"]) * a
        return tuple(walk[i] + _wrap(st["ov"][i] - walk[i]) * st["w"] for i in range(2))


def resolve(spec, shoulder, L1, L2, to_local):
    """spec: None | ("ang", upper, fore) | ("tgt", lx, ly) local | ("scr", sx, sy) screen."""
    if spec is None:
        return None
    kind = spec[0]
    if kind == "ang":
        return spec[1], spec[2]
    tx, ty = (spec[1], spec[2]) if kind == "tgt" else to_local(spec[1], spec[2])
    return ik(shoulder[0], shoulder[1], tx, ty, L1, L2)


def arm_parts(out, names, shoulder, a1, a2, L1, L2, at, d, overlap=3):
    """Write upper/elbow/fore/hand parts; returns local (elbow, hand) points."""
    up, elbow, fore, hand = names
    sx, sy = shoulder
    ex, ey = bone_end(sx, sy, a1, L1)
    hx, hy = bone_end(ex, ey, a2, L2)
    cx, cy = bone_end(sx, sy, a1, L1 / 2)
    out[up] = at(cx, cy, rotation=a1 * d, sy=(L1 + overlap) / L1)
    out[elbow] = at(ex, ey)
    fx, fy = bone_end(ex, ey, a2, L2 / 2)
    out[fore] = at(fx, fy, rotation=a2 * d, sy=(L2 + overlap) / L2)
    out[hand] = at(hx, hy)
    return (ex, ey), (hx, hy)


def held_stick(out, name, tip_name, hand, direction, length, at, d, tip_len=None):
    """A stick (spoon, skewer) gripped in the hand, pointing along `direction` (local vector)."""
    n = math.hypot(*direction) or 1
    ux, uy = direction[0] / n, direction[1] / n
    a = vec_angle(ux, uy)
    out[name] = at(hand[0] + ux * length / 2, hand[1] + uy * length / 2, rotation=a * d)
    if tip_name:
        tl = tip_len or length
        out[tip_name] = at(hand[0] + ux * tl, hand[1] + uy * tl, rotation=a * d)
