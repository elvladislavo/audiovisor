#!/usr/bin/env python3
"""Procedural sound design for the mullet chef animation -> soundtrack.wav (48 kHz stereo).

Everything is synthesised (no samples, nothing copyrighted) and timed from the same
story clock as the picture: footsteps come from the characters' walk cycles, and
effects are placed on the story beats (story time x K = real seconds).
"""
import math, os, wave
import numpy as np

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(7)

import generate as G          # re-runs the generator (deterministic) and gives us the poses
import girl as GL
K, DUR, S1, S2, S3 = G.K, G.DUR * G.K, G.S1, G.S2, G.S3
N = int(round(DUR * SR))
mixL, mixR = np.zeros(N), np.zeros(N)


# ------------------------------------------------------------------ building blocks
def secs(d): return np.arange(int(round(d * SR))) / SR
def noise(d): return rng.standard_normal(int(round(d * SR)))

def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))

def env(n, a=0.005, decay=0.1, hold=0.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    rel = np.clip(t - a - hold, 0, None)
    return e * np.exp(-rel / decay)

def bell(n, width=0.35):
    u = np.linspace(-1, 1, n); return np.exp(-(u / width) ** 2)

def fade(x, fi=0.01, fo=0.01):
    n = len(x); a, b = int(round(fi * SR)), int(round(fo * SR))
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)
    return x

def norm(x, peak=1.0):
    m = np.abs(x).max(); return x / m * peak if m > 0 else x

def tone(freq, d, harm=(1,), phase_mod=None):
    t = secs(d); f = np.broadcast_to(freq, t.shape) if np.ndim(freq) else np.full_like(t, freq)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return sum(a * np.sin(ph * (k + 1)) for k, a in enumerate(harm))

def reverb(x, size=0.5, mix=0.25, damp=3000):
    ir = noise(size) * np.exp(-secs(size) / (size / 5)); ir = band(ir, 80, damp); ir /= np.abs(ir).sum() / 8
    wet = np.fft.irfft(np.fft.rfft(x, len(x) + len(ir)) * np.fft.rfft(ir, len(x) + len(ir)))[:len(x)]
    return x * (1 - mix) + norm(wet, np.abs(x).max() or 1) * mix

def place(sig, t, gain=1.0, pan=0.0):
    """Add a mono sound at real time t (s) with equal-power pan (-1 left .. 1 right)."""
    i = int(round(t * SR))
    if i >= N: return
    if i < 0: sig, i = sig[-i:], 0
    sig = sig[:N - i] * gain
    a = (pan + 1) * math.pi / 4
    mixL[i:i + len(sig)] += sig * math.cos(a); mixR[i:i + len(sig)] += sig * math.sin(a)

def place_st(L, R, t, gain=1.0):
    i = int(round(t * SR)); L, R = L[:N - i] * gain, R[:N - i] * gain
    mixL[i:i + len(L)] += L; mixR[i:i + len(R)] += R

def xpan(x):  # screen x (0..640) -> pan
    return float(np.clip((x - 320) / 320 * 0.8, -0.9, 0.9))

def R(story): return story * K   # story time -> real seconds


# ------------------------------------------------------------------ sound recipes
def footstep(kind):
    d = 0.12; n = int(round(d * SR))
    thump = tone(95 if kind != "heel" else 160, d) * env(n, 0.002, 0.025)
    grit = band(noise(d), 300, 4000 if kind == "street" else 2500) * env(n, 0.001, 0.02)
    if kind == "heel":
        grit = band(noise(d), 1800, 7000) * env(n, 0.0005, 0.012) * 1.6
    return norm(thump * 0.7 + grit * 0.5, 0.5)

def car_pass(d=4.0, f0=62):
    n = int(round(d * SR))
    rumble = band(noise(d), 40, 900) * 0.8
    engine = tone(np.linspace(f0 * 1.06, f0 * 0.92, n), d, harm=(1, .5, .33, .2)) * 0.35
    tyres = band(noise(d), 900, 4500) * 0.25
    x = (rumble + engine + tyres) * bell(n, 0.42)
    pan = np.linspace(-1, 1, n) * 0.9; a = (pan + 1) * np.pi / 4
    return norm(x * np.cos(a), 0.6), norm(x * np.sin(a), 0.6)

def meow(d=0.6, base=520):
    n = int(round(d * SR)); u = np.linspace(0, 1, n)
    f = base + 330 * np.sin(np.pi * u ** 0.7) - 140 * u
    x = tone(f, d, harm=(1, .7, .5, .35, .2, .12))
    x = band(x, 450, 3400) * np.minimum(1, u / 0.08) * np.minimum(1, (1 - u) / 0.35)
    return norm(x, 0.5)

def chime(freqs, d=1.4, decay=0.45, partial=2.76):
    n = int(round(d * SR)); x = np.zeros(n)
    for i, f in enumerate(freqs):
        seg = (tone(f, d) + 0.3 * tone(f * partial, d)) * env(n, 0.002, decay)
        off = int(round(i * 0.16 * SR)); x[off:] += seg[:n - off]
    return norm(x, 0.5)

def whoosh(d=0.5, lo=300, hi=5000):
    n = int(round(d * SR)); return norm(band(noise(d), lo, hi) * bell(n, 0.4) ** 1.5, 0.5)

def sparkle(d=0.7, f0=1500, f1=4200, count=9):
    n = int(round(d * SR)); x = np.zeros(n)
    for k in range(count):
        f = f0 * (f1 / f0) ** (k / count) * (1 + 0.04 * rng.standard_normal())
        s = tone(f, 0.25) * env(int(round(0.25 * SR)), 0.002, 0.06)
        o = int(round(k / count * (d - 0.25) * SR)); x[o:o + len(s)] += s
    return norm(x, 0.45)

def crackle(d, rate=400, lo=1500, hi=9000):
    n = int(round(d * SR)); x = np.zeros(n)
    idx = rng.integers(0, n, int(rate * d)); x[idx] = rng.standard_normal(len(idx))
    x = np.convolve(x, np.exp(-np.arange(60) / 12))[:n]
    return band(x, lo, hi)

def rustle(d=0.3):
    n = int(round(d * SR)); return norm(crackle(d, 900, 1500, 9000) * bell(n, 0.5), 0.45)

def plop(f0=420, f1=140, d=0.12):
    n = int(round(d * SR)); return norm(tone(np.geomspace(f0, f1, n), d) * env(n, 0.002, 0.04), 0.5)

def beep(f=1250, d=0.09):
    n = int(round(d * SR)); return norm(tone(f, d, harm=(1, 0, .3)) * env(n, 0.002, 1, d), 0.25)

def coins(d=0.6):
    n = int(round(d * SR)); x = np.zeros(n)
    for k in range(7):
        f = rng.uniform(3000, 6200); s = tone(f, 0.2, harm=(1, .3)) * env(int(round(0.2 * SR)), 0.001, 0.035)
        o = int(round(rng.uniform(0, d - 0.2) * SR)); x[o:o + len(s)] += s
    return norm(x, 0.35)

def clank(d=0.35):
    n = int(round(d * SR))
    x = sum(tone(f, d) * a for f, a in ((610, 1), (1180, .6), (1890, .4), (2730, .25))) * env(n, 0.001, 0.06)
    return norm(x + band(noise(d), 1500, 6000) * env(n, 0.001, 0.01) * 0.6, 0.4)

def scrape(d=0.28):
    n = int(round(d * SR)); return norm(band(noise(d), 700, 2600) * bell(n, 0.45) * (1 + 0.5 * np.sin(secs(d) * 2 * np.pi * 37)), 0.25)

def ignition():
    d = 0.7; n = int(round(d * SR))
    click = band(noise(0.02), 2000, 9000) * env(int(round(0.02 * SR)), 0.0005, 0.004)
    fwump = band(noise(d), 60, 700) * env(n, 0.03, 0.18)
    x = np.zeros(n); x[:len(click)] += click * 2; x += fwump
    return norm(x, 0.55)

def sizzle(d):
    n = int(round(d * SR)); t = secs(d)
    hiss = band(noise(d), 2500, 11000) * (0.65 + 0.35 * np.sin(2 * np.pi * 0.7 * t) * np.sin(2 * np.pi * 0.23 * t))
    pops = crackle(d, 60, 900, 7000) * 3
    return fade(norm(hiss * 0.6 + pops * 0.4, 0.4), 0.4, 0.5)

def hum_note(f, d=0.42):
    n = int(round(d * SR)); t = secs(d)
    x = tone(f * (1 + 0.006 * np.sin(2 * np.pi * 5.2 * t)), d, harm=(1, .35, .12))
    return norm(band(x, 80, 1500) * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.12), 0.3)

def blip(f, d=0.07):
    n = int(round(d * SR)); x = tone(np.linspace(f * 1.1, f * 0.9, n), d, harm=(1, .6, .4, .25))
    return norm(band(x, 200, 3500) * np.sin(np.pi * np.arange(n) / n), 0.35)

def say(f, syllables, t, gain=0.5, pan=0.0):  # cartoon "voice" blips
    for i in range(syllables):
        place(blip(f * (1.0 + 0.12 * ((-1) ** i)), 0.08), t + i * 0.11, gain, pan)

def mmm(d=0.8, f=230):
    n = int(round(d * SR)); u = np.linspace(0, 1, n)
    x = tone(f * (1 + 0.25 * np.sin(np.pi * u)), d, harm=(1, .5, .25))
    return norm(band(x, 100, 900) * np.minimum(1, u / 0.1) * np.minimum(1, (1 - u) / 0.3), 0.35)

def growl(d=1.2):
    n = int(round(d * SR)); t = secs(d)
    x = band(noise(d), 40, 220) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t) ** 2)
    x += tone(75 + 25 * np.sin(2 * np.pi * 2.2 * t), d) * 0.4
    return norm(x * bell(n, 0.5), 0.55)

def crunch(d=0.22):
    n = int(round(d * SR)); return norm(crackle(d, 2500, 400, 6000) * env(n, 0.003, 0.07), 0.5)

def fanfare():
    notes = [523.25, 659.25, 783.99, 1046.5]; d = 1.6; x = np.zeros(int(round(d * SR)))
    for i, f in enumerate(notes):
        dd = d - i * 0.12; n = int(round(dd * SR))
        s = band(tone(f, dd, harm=(1, .6, .45, .3, .2, .12)), 150, 6000) * env(n, 0.01, 0.35 if i < 3 else 0.7)
        o = int(round(i * 0.12 * SR)); x[o:o + n] += s
    return norm(x, 0.45)

def ambience(d, kind):
    n = int(round(d * SR)); t = secs(d)
    if kind == "street":   # distant city rumble + air + far traffic swells
        x = band(noise(d), 25, 320) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.11 * t))
        x += band(noise(d), 1500, 6000) * 0.05
        x = norm(x, 0.22)
    elif kind == "shop":   # fridge hum, room tone, faint in-store music
        hum = sum(tone(f, d) * a for f, a in ((50, .5), (100, .35), (150, .15))) * 0.25
        room = band(noise(d), 60, 1200) * 0.4
        chords = [(261.6, 329.6, 392), (220, 261.6, 329.6), (174.6, 220, 261.6), (196, 246.9, 293.7)]
        pad = np.zeros(n)
        for i, ch in enumerate(chords * 4):
            s0 = int(round(i * 1.0 * SR)); s1 = min(n, s0 + int(round(1.1 * SR)))
            if s0 >= n: break
            seg = sum(tone(f, (s1 - s0) / SR, harm=(1, .3)) for f in ch) * bell(s1 - s0, 0.6)
            pad[s0:s1] += seg
        x = norm(hum + room, 0.12) + norm(band(pad, 100, 2500), 0.05)
    else:                  # kitchen: quiet room + fridge, a ticking clock
        x = norm(band(noise(d), 50, 900) * 0.4 + tone(50, d) * 0.2, 0.08)
        for k in range(int(d)):
            i = int(round((k + 0.5) * SR)); c = band(noise(0.01), 2500, 8000) * env(int(round(0.01 * SR)), 0.0005, 0.002)
            x[i:i + len(c)] += c * 0.25
    return fade(x, 0.6, 0.6)


# ------------------------------------------------------------------ the mix
cut2, cut3 = R(S2), R(S3)

# ambiences (cross-fading across the dips to black)
for t0, t1, kind, g in ((0, cut2 + 0.5, "street", 1.0), (cut2 - 0.5, cut3 + 0.5, "shop", 1.0),
                        (cut3 - 0.5, DUR, "kitchen", 1.0)):
    place(ambience(t1 - t0, kind), t0, g)  # mono bed, centred

# offscreen cars passing on the street (heard, not seen)
for t, f0, g in ((0.4, 58, 0.55), (4.6, 66, 0.45), (8.1, 52, 0.5)):
    L, Rr = car_pass(4.0, f0); place_st(L, Rr, t, g)

# footsteps from the walk cycles (one step per half cycle)
def steps(pose_fn, start, end, kind_of, pan_of, gain):
    prev = None
    for i in range(int(start * 480), int(end * 480)):
        rt = i / 480; p = pose_fn(rt / K, rt)
        if not p.get("walk") or not p.get("vis", 1):
            prev = None; continue
        s = math.sin(p["phase"])
        if prev is not None and (prev < 0) != (s < 0):
            place(footstep(kind_of(rt)), rt, gain * (0.85 + 0.3 * rng.random()), pan_of(p["x"]))
        prev = s

def floor(rt): return "street" if rt < cut2 else "soft"
steps(G.pose, 0, DUR, floor, xpan, 0.55)
steps(GL.pose, cut2, DUR, lambda rt: "heel", xpan, 0.45)

# street
place(growl(1.3), R(0.55), 0.8, xpan(120))                 # stomach: "głodny..."
place(meow(0.55, 560), R(0.9), 0.35, xpan(560))            # the cat
place(chime([1318.5, 1046.5], 1.4, 0.4), R(2.05), 0.18, xpan(456))   # door bell as the cat slips in
place(chime([1318.5, 1046.5], 1.6, 0.5), R(3.65), 0.32, xpan(456))   # ...and as he goes in

# shop
place(meow(0.5, 600), R(S2 + 0.55), 0.35, xpan(60))
place(whoosh(0.55, 400, 6000), R(S2 + 0.93), 0.5, xpan(118))       # poof
place(sparkle(0.8), R(S2 + 0.98), 0.6, xpan(118))
place(band(noise(0.15), 80, 600) * env(int(round(0.15 * SR)), 0.002, 0.04), R(S2 + 1.32), 0.4, xpan(80))  # fridge seal
for k in range(4):
    place(chime([2349 + 180 * k], 0.4, 0.06, 2.1), R(S2 + 1.45 + k * 0.2), 0.12, xpan(84))        # bottles clink
for k in range(3):
    take = R(S2 + G.GRAB_T0 + k * G.GRAB_DT + G.REACH); drop = R(S2 + G.GRAB_T0 + k * G.GRAB_DT + G.CARRY)
    place(rustle(0.22), take - 0.05, 0.45, xpan(240))
    place(rustle(0.35), drop - 0.1, 0.6, xpan(230)); place(plop(260, 120), drop, 0.4, xpan(230))
say(620, 2, R(S2 + 2.35), 0.55, xpan(120))                 # her "hej!"
say(330, 2, R(S2 + 3.05), 0.6, xpan(250))                  # his "hej!"
place(sparkle(0.6, 1800, 3400, 5), R(S2 + 2.6), 0.25, xpan(125))
place(sparkle(0.6, 1500, 3000, 5), R(S2 + 3.1), 0.25, xpan(240))
place(beep(), R(S2 + 4.02), 0.5, xpan(540)); place(beep(), R(S2 + 4.07), 0.5, xpan(540))
place(chime([2093, 2637], 1.2, 0.35), R(S2 + 4.1), 0.45, xpan(540))   # *ding*
place(coins(), R(S2 + 4.15), 0.5, xpan(530))
say(520, 3, R(S2 + 4.05), 0.4, xpan(590))                  # cashier: "dziękuję!"

# kitchen
place(ignition(), R(S3 + 0.88), 0.6, xpan(300))
place(sizzle(R(3.3)), R(S3 + 0.95), 0.36, xpan(300))
for i in range(3):
    place(plop(380 - 40 * i, 160), R(S3 + 1.4 + i * 0.35), 0.5, xpan(300))
    place(crackle(0.4, 1500, 1500, 9000) * env(int(round(0.4 * SR)), 0.002, 0.12) * 0.5, R(S3 + 1.4 + i * 0.35), 0.6, xpan(300))
rt = R(S3 + 1.1)
while rt < R(S3 + 4.0):                                     # spoon scraping the pan, once per stir
    place(scrape(), rt, 0.5, xpan(305)); rt += 2 * math.pi / 7
for i in range(12):                                         # pan shakes
    place(clank(), R(S3 + 1.0 + i * 0.25), 0.18, xpan(300))
melody = [392, 440, 494, 587.3, 494, 440]
for i, f in enumerate(melody):                              # he hums along with the music notes
    place(hum_note(f / 2, 0.5), R(S3 + 1.25 + i * 0.45), 0.45, xpan(362))
place(chime([1760], 0.8, 0.2, 2.4), R(S3 + 4.0), 0.3, xpan(470))     # plate on the counter
place(fanfare(), R(S3 + 4.4), 0.55, 0)
place(sparkle(1.0, 2000, 5000, 12), R(S3 + 4.6), 0.35, xpan(470))
place(crunch(), R(S3 + 4.58), 0.6, xpan(545))
place(mmm(0.9, 240), R(S3 + 4.7), 0.6, xpan(545))
say(640, 4, R(S3 + 5.0), 0.45, xpan(545))                  # "Pyszne!"

# dips to black: duck everything a little through each cut
for c in (cut2, cut3):
    i0, i1 = int(round((c - 0.7) * SR)), int(round((c + 0.6) * SR))
    duck = 1 - 0.55 * np.sin(np.linspace(0, np.pi, i1 - i0))
    mixL[i0:i1] *= duck; mixR[i0:i1] *= duck

# master: gentle room, soft limiter, fade in/out
L = reverb(mixL, 0.45, 0.12); Rr = reverb(mixR, 0.47, 0.12)
peak = max(np.abs(L).max(), np.abs(Rr).max())
L, Rr = np.tanh(L / peak * 1.4) / np.tanh(1.4), np.tanh(Rr / peak * 1.4) / np.tanh(1.4)
L, Rr = fade(L * 0.89, 0.5, 1.2), fade(Rr * 0.89, 0.5, 1.2)
pcm = (np.stack([L, Rr], 1) * 32767).astype(np.int16)
out = os.path.join(HERE, "soundtrack.wav")
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("wrote", out, f"{DUR:.1f}s")
