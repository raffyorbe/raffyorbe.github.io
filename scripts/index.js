document.addEventListener("DOMContentLoaded", function () {
  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll(".floating-navbar a");

  //Nav bar scroll listener

  function getCurrentSectionId() {
    let scrollPos = window.scrollY + window.innerHeight / 3;

    for (let section of sections) {
      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;

      if (scrollPos >= top && scrollPos < bottom) {
        return section.id;
      }
    }

    return null;
  }

  function onScroll() {
    const currentSectionId = getCurrentSectionId();

    navLinks.forEach(link => {
      const dataTargets = link.getAttribute("data-targets");

      // If data-targets is present, split and check
      if (dataTargets) {
        const targets = dataTargets.split(",");
        if (targets.includes(currentSectionId)) {
          link.classList.add("active");
        } else {
          link.classList.remove("active");
        }
      }
      else {
        // Fallback to href-based matching
        const href = link.getAttribute("href");
        const targetId = href.startsWith("#") ? href.slice(1) : null;

        if (targetId === currentSectionId) {
          link.classList.add("active");
        }
        else {
          link.classList.remove("active");
        }
      }
    });
  }

  window.addEventListener("scroll", onScroll);
  onScroll(); // run on page load

  // AI chat glow

  const glow = document.querySelector('.home-chat-border-wrapper .chat-bar-glow');

  // Intro glow: the chat bubble's reply reveal (see revealReply and settleGlow below), played
  // once behind the input, with the bubble's colors in every browser. Like a reply, it fades in
  // rotating (the spin starts fast and the ring's gap fills in) and swells to full strength and
  // its widest spread 18% into the bubble's 1.4s reveal, while the spin slows to rest. Unlike
  // the bubble, which settles and keeps glowing, it fades out slowly from the peak to nothing;
  // the glow is switched off after.
  const CHAT_BAR_GLOW_FADE_MS = 1600; // slow fade out after the peak

  // Its crisp 1px edge line (.chat-bar-core) is an unblurred copy that runs the same spin
  // and fade, started in the same frame so the two stay in step.
  const glowCore = document.querySelector('.home-chat-border-wrapper .chat-bar-core');

  // Plays the intro on a glow (a .chat-bar-glow) and its crisp edge line (a .chat-bar-core, if
  // any), then switches them off. Shared by the chat bar and the "Ask AI Raffy" button, which
  // passes a smaller spread (blurPeakPx). Returns how long it runs, in ms.
  function playIntroGlow(glowEl, coreEl, blurPeakPx) {
    const clip = glowEl.querySelector('.chat-glow-clip');
    const layers = coreEl ? [glowEl, coreEl] : [glowEl];
    // Restartable (the button replays it on every hover): drop a run still in progress
    clearTimeout(glowEl.introDoneTimer);
    layers.forEach((layer) => {
      layer.getAnimations({ subtree: true }).forEach((a) => a.cancel());
      layer.classList.remove('done');
    });
    // Each spin is started here, from script, in the same moment for both layers: the bubble's
    // 6s-per-lap rotation at its fast loading speed, which settleGlow eases to rest below.
    layers.forEach((layer) => {
      const spin = layer.querySelector('.chat-glow-spin').animate(
        [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
        { duration: GLOW_REST_MS, iterations: Infinity }
      );
      spin.playbackRate = GLOW_LOADING_RATE;
      layer.classList.add('visible');
    });

    // Computed here, not at the top level: the bubble's constants are declared further down
    const peakMs = 0.18 * GLOW_REPLY_FLASH_MS; // the bubble's peak, ~250ms in
    const total = peakMs + CHAT_BAR_GLOW_FADE_MS;
    const fade = [
      { opacity: 0, easing: 'ease-out' },
      { opacity: GLOW_REPLY_PEAK, offset: peakMs / total, easing: 'ease-in-out' },
      { opacity: 0 },
    ];
    clip.animate(fade, { duration: total, fill: 'forwards' });
    if (coreEl) coreEl.animate(fade, { duration: total, fill: 'forwards' });

    // The bubble's spread: the steady blur widening to blurPeakPx at the peak, back by the end
    // of the reveal (7px to 12px on the chat bar)
    const steadyBlur = getComputedStyle(glowEl).filter;
    glowEl.animate(
      [
        { filter: steadyBlur, easing: 'ease-out' },
        { filter: `blur(${blurPeakPx}px)`, offset: 0.18, easing: 'ease-in-out' },
        { filter: steadyBlur },
      ],
      { duration: GLOW_REPLY_FLASH_MS }
    );

    layers.forEach((layer) => settleGlow(layer)); // the bubble's spin slowdown to rest

    glowEl.introDoneTimer = setTimeout(() => layers.forEach((layer) => layer.classList.add('done')), total + 100);
    return total;
  }

  function playChatBarGlow() {
    const total = playIntroGlow(glow, glowCore, GLOW_REPLY_BLUR_PEAK_PX);
    setTimeout(() => {
      chatBarGlowDone = true;
      document.dispatchEvent(new Event('chatbarglowdone')); // starts the hero's mobile drift
    }, total + 100);
  }

  // Starts the intro 500ms after the page is actually on screen. The page can load, and even
  // render, while hidden: Safari preloads a site you've visited as a "Top Hit" while you're
  // still typing in the address bar (and Chrome can prerender it), and swaps it in only when
  // you press Return. Started from load alone, the short intro could be half over, or done,
  // by the time you saw it. So while the page is hidden (or prerendering) this waits for it to
  // become visible, and it checks again when the 500ms pause ends.
  let chatBarGlowStarted = false;
  let chatBarGlowDone = !glow; // no intro glow on the page: nothing to wait for

  function pageIsShown() {
    return document.visibilityState === 'visible' && !document.prerendering;
  }

  function startChatBarGlowWhenShown() {
    if (chatBarGlowStarted) return;
    if (!pageIsShown()) {
      const onShown = () => {
        if (!pageIsShown()) return;
        document.removeEventListener('visibilitychange', onShown);
        document.removeEventListener('prerenderingchange', onShown);
        startChatBarGlowWhenShown();
      };
      document.addEventListener('visibilitychange', onShown);
      document.addEventListener('prerenderingchange', onShown);
      return;
    }
    setTimeout(() => {
      if (chatBarGlowStarted) return;
      if (!pageIsShown()) return startChatBarGlowWhenShown(); // hidden again during the pause
      chatBarGlowStarted = true;
      playChatBarGlow();
      document.dispatchEvent(new Event('chatbarglowstart')); // the placeholder types in with it
    }, 500); // a short pause after the page appears
  }

  if (glow) {
    const target = document.querySelector('.home-chat-border-wrapper');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            
            startChatBarGlowWhenShown(); // the intro glow, once the page is on screen

            observer.unobserve(entry.target); // optional: only trigger once
          }
        });
      },
      {
        root: null, // use viewport as root
        threshold: 0, // we’ll rely on rootMargin instead
        rootMargin: '-30% 0px -30% 0px'
        // top and bottom margins shrink the "trigger zone" to the center 10% of the screen
      }
    );
    observer.observe(target);
  }

  // Setup AI chat response UI

  const inputWrapper = document.querySelector('.home-chat-border-wrapper');

  // create overlay container if not exists
  let overlayContainer = inputWrapper.querySelector('#chat-overlay-container');
  if (!overlayContainer) {
    overlayContainer = document.createElement('div');
    overlayContainer.id = 'chat-overlay-container';
    inputWrapper.appendChild(overlayContainer);
  }

  // ChatGPT integration
  // Elements
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");

  // Notification sound played when a text reply (not the loading dots) appears.
  // Played through Web Audio rather than an <audio> element: the file is decoded into memory
  // up front, so it starts right away at the exact offset. An <audio> element has to wake up
  // and seek after the wait for a reply, which made the sound land late in Safari and choke
  // on phones.
  const REPLY_SOUND_URL = "audio/ai-raffy-notification.mp3";

  // The file opens with 0.3s of silence before a sharp hit (at 0.30s). Skip it so the hit comes
  // right as the sound starts (0 and 0.1s also tried).
  const REPLY_SOUND_START_S = 0.29;

  // The ding lands once the reply bubble has fully floated up: .chat-overlay.reply-in's
  // fadeUpNew is 0.35s in styles/index.css. Scheduled on the audio clock, so it's exact.
  const REPLY_SOUND_DELAY_S = 0.35;

  // How long a reply waits for a paused audio context to wake before skipping its sound
  const REPLY_SOUND_WAKE_LIMIT_MS = 300;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioCtx ? new AudioCtx() : null;
  let replySoundBuffer = null;
  let replySoundSource = null;

  if (audioCtx) {
    fetch(REPLY_SOUND_URL)
      .then((res) => res.arrayBuffer())
      // Callback form of decodeAudioData for older Safari, which has no promise version
      .then((data) => new Promise((resolve, reject) => audioCtx.decodeAudioData(data, resolve, reject)))
      .then((buffer) => { replySoundBuffer = buffer; })
      .catch(() => {});
  }

  // delayS: how long from now until the hit should land
  function startReplySound(delayS) {
    // Restart rather than overlap if a previous reply's sound is still playing
    if (replySoundSource) replySoundSource.stop();
    replySoundSource = audioCtx.createBufferSource();
    replySoundSource.buffer = replySoundBuffer;
    replySoundSource.connect(audioCtx.destination);
    replySoundSource.start(audioCtx.currentTime + Math.max(0, delayS), REPLY_SOUND_START_S);
  }

  function playReplySound() {
    if (!audioCtx || !replySoundBuffer) return;
    if (audioCtx.state === "running") {
      startReplySound(REPLY_SOUND_DELAY_S);
      return;
    }

    // Never start a sound on a paused context: Safari holds it until the context next resumes
    // (the next send), so it played late, back to back with the next reply's sound. Try to wake
    // the context instead, and skip the sound if that doesn't happen quickly. Outside a user
    // gesture, resume() can stay pending until the next one, so the time check matters.
    const requestedAt = performance.now();
    audioCtx.resume()
      .then(() => {
        const wokeAfterMs = performance.now() - requestedAt;
        if (audioCtx.state === "running" && wokeAfterMs <= REPLY_SOUND_WAKE_LIMIT_MS) {
          // Count the wake time against the delay, so the hit still lands at the end of the float-up
          startReplySound(REPLY_SOUND_DELAY_S - wokeAfterMs / 1000);
        }
      })
      .catch(() => {});
  }

  // Browsers keep an AudioContext suspended until a user gesture resumes it. Resume it here,
  // inside the send click/keydown, so the reply sound can play whenever the response arrives.
  // Doing it on every send also recovers a context Safari suspended or interrupted in between.
  // The silent one-sample buffer is for older iOS Safari, which also wants a sound started
  // during the gesture before it will play any later.
  function unlockReplySound() {
    if (!audioCtx) return;
    if (audioCtx.state !== "running") audioCtx.resume().catch(() => {});
    const silent = audioCtx.createBufferSource();
    silent.buffer = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
    silent.connect(audioCtx.destination);
    silent.start(0);
  }

  // Hero overlay switches to a frosted dark layer while a chat bubble is showing
  const heroOverlay = inputWrapper.closest('.home-overlay');

  function setHeroChatActive(active) {
    if (heroOverlay) heroOverlay.classList.toggle('chat-active', active);
    // Pauses the hero's light trail while the chat has the focus (see the trail code below)
    document.dispatchEvent(new CustomEvent('herochatchange', { detail: { active } }));
  }

  // Fade a bubble down and out and drop the frosted layer behind it. Shared by the close
  // button (on a reply) and the stop button (while loading), so both leave the same way.
  function hideBubble(bubble) {
    // Only the hero's chat has the frosted layer (the "Ask AI Raffy" bubbles have none)
    if (overlayContainer.contains(bubble)) setHeroChatActive(false);
    bubble.classList.remove("reply-in"); // let a still-running reply fade-up yield to the fade-down
    bubble.classList.add("hide");

    // Remove once the bubble's own fade-down finishes. transitionend also bubbles up from
    // the glow's ring fade-in (0.9s after a reply), which would otherwise cut the fade short
    // if the bubble is closed soon after the reply lands. The timeout covers a slide that
    // never runs.
    const onEnd = (e) => {
      if (e.target !== bubble) return;
      bubble.removeEventListener("transitionend", onEnd);
      bubble.remove();
    };
    bubble.addEventListener("transitionend", onEnd);
    setTimeout(() => bubble.remove(), 450);
  }

  // Glow spin. The CSS animation rests at 6s per rotation (.chat-glow-spin in styles/index.css).
  // While loading it runs faster through playbackRate and eases back to rest when the reply
  // lands. Changing playbackRate, unlike changing animation-duration, keeps the glow at its
  // current angle, so it never snaps.
  const GLOW_REST_MS = 6000;   // .chat-glow-spin animation-duration in styles/index.css
  const DOTS_CYCLE_MS = 1400;  // .typing .dot blink duration in styles/index.css

  // Loading pace: two glow laps per dot cycle (0.7s per lap). A whole-number ratio keeps the
  // two locked together instead of drifting. The loading bubble is a circle, so the glow moves
  // at an even speed all the way around. The two laps in a cycle meet the dots at different
  // moments (one as they ripple, one as they rest), so the glow also breathes with the dots
  // (see .chat-glow-clip in styles/index.css) to make each pass look intended. (One lap per
  // cycle, 1.4s, and one per two cycles, 2.8s, were tried too.)
  const GLOW_LOADING_MS = DOTS_CYCLE_MS / 2;
  const GLOW_LOADING_RATE = GLOW_REST_MS / GLOW_LOADING_MS;
  const GLOW_SETTLE_MS = 900;

  // Opening swell when a reply lands: the glow rises to GLOW_REPLY_PEAK about 18% of the way in
  // (1 is full opacity, the most there is: 25% above the steady 0.8), then fades back down to
  // steady over the rest. It starts from wherever the loading breathing is, so nothing snaps.
  const GLOW_REPLY_PEAK = 1;
  const GLOW_REPLY_FLASH_MS = 1400;
  // The swell also spreads the glow outward: its blur grows from the steady 7px to this at the
  // same moment, then back, so the halo reaches further as it brightens. The blur always
  // starts and ends at the constant steady value, so this is smooth wherever loading stopped.
  // The glow's transparent margin (.chat-glow in styles/index.css) is sized to 2x this, so
  // the wider blur still fades out inside its own box.
  const GLOW_REPLY_BLUR_PEAK_PX = 12;

  // Phase lock with the typing dots. Both animations start together. The dots sit centered in
  // the bubble and ripple left to right, and along the top edge the glow also moves left to
  // right, so start the spin at the angle that puts the arc's white peak straight above the
  // dots (12 o'clock) at the ripple's peak: the brightest part of the glow passes over them in
  // the same direction as the ripple, on every lap (so twice per dot cycle).
  // The ripple's peak is when the three dots are brightest together (the sum of their
  // opacities), 630ms into the cycle. That's earlier than the middle dot's own peak (760ms)
  // because the blink's default `ease` curve rises fast. Aiming at the middle dot's peak put the
  // white ~70deg past the dots by the time the ripple peaked.
  const GLOW_WHITE_DEG = 0.69 * 360; // white stop (69%) in .chat-glow-arc
  const DOTS_ABOVE_DEG = 0;          // 12 o'clock, straight above the centered dots
  const RIPPLE_PEAK_MS = 630;        // keep in step with the 45% peak of chat-glow-breathe in styles/index.css
  const GLOW_LOADING_PHASE =
    ((((DOTS_ABOVE_DEG - GLOW_WHITE_DEG - (360 * RIPPLE_PEAK_MS) / GLOW_LOADING_MS) % 360) + 360) % 360) / 360;

  function getGlowSpin(bubble) {
    const spin = bubble.querySelector(".chat-glow-spin");
    return spin && spin.getAnimations ? spin.getAnimations()[0] : null;
  }

  // Waits for the spin to actually be running first (its ready promise). This changes the speed
  // every frame, and in Chromium each change made while a just-started animation is still
  // pending restarts its wait, so a spin started right before this (the chat bar intro)
  // could stay frozen at 0 through the whole slowdown.
  function settleGlow(bubble) {
    const anim = getGlowSpin(bubble);
    if (!anim) return;
    anim.ready.then(() => {
      const from = anim.playbackRate;
      const start = performance.now();
      function step(now) {
        const t = Math.min(1, (now - start) / GLOW_SETTLE_MS);
        const eased = 1 - Math.pow(1 - t, 3);
        anim.playbackRate = from + (1 - from) * eased;
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  // Opening swell of a glow (a reply landing, or the skills modal opening): from fromOpacity up
  // to GLOW_REPLY_PEAK, then back down to steady, with the blur spreading and narrowing in step.
  // When it ends the clip is back on its CSS opacity, which equals the last keyframe, so there's
  // no jump.
  function swellGlow(container, fromOpacity) {
    const glowClip = container.querySelector(".chat-glow-clip");
    if (!glowClip || !glowClip.animate) return;
    const steady = getComputedStyle(glowClip).opacity; // the CSS value (any breathing must be gone)
    glowClip.animate(
      [
        { opacity: fromOpacity, easing: "ease-out" },
        { opacity: GLOW_REPLY_PEAK, offset: 0.18, easing: "ease-in-out" },
        { opacity: steady },
      ],
      { duration: GLOW_REPLY_FLASH_MS }
    );

    // Spread: the same shape and timing on the blur radius, so the halo widens as it brightens.
    // Loading never changes the blur, so this always starts from the same steady value.
    const glowWrapper = container.querySelector(".chat-glow");
    if (glowWrapper) {
      const steadyBlur = getComputedStyle(glowWrapper).filter; // e.g. "blur(7px)"
      glowWrapper.animate(
        [
          { filter: steadyBlur, easing: "ease-out" },
          { filter: `blur(${GLOW_REPLY_BLUR_PEAK_PX}px)`, offset: 0.18, easing: "ease-in-out" },
          { filter: steadyBlur },
        ],
        { duration: GLOW_REPLY_FLASH_MS }
      );
    }
  }

  // Function to add AI message bubble
  // container: where the bubble goes, the hero's chat by default, or the "Ask AI Raffy"
  // layer under the navbar (askContainer), which has no frosted layer
  function addAIBubble(message, isLoading = false, container = overlayContainer) {
    if (!container) return null; // return null if no container
    container.innerHTML = "";
    if (container === overlayContainer) setHeroChatActive(true);

    const bubble = document.createElement("div");
    bubble.className = "chat-overlay" + (isLoading ? " loading" : "");

    // Animated glow behind the bubble (see the .chat-glow comment in styles/index.css)
    const glow = document.createElement("div");
    glow.className = "chat-glow";
    glow.setAttribute("aria-hidden", "true");
    glow.innerHTML =
      '<div class="chat-glow-clip"><div class="chat-glow-spin"><div class="chat-glow-arc"></div><div class="chat-glow-color"></div></div></div>';
    bubble.appendChild(glow);

    // Create message container
    const textElem = document.createElement("div");
    textElem.className = "chat-text";

    if (isLoading) {
      // typing animation
      textElem.innerHTML = `<span class="typing">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </span>`;
    } else {
      textElem.textContent = message;
    }
    bubble.appendChild(textElem);

    // Close button. The label gives screen readers "Close" instead of "times" for the ×.
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "chat-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    bubble.appendChild(closeBtn);

    // Close fade-out. The button disappears with the bubble, so a keyboard user's focus goes
    // back to the chat input. Mouse and touch closes leave focus alone, so a tap doesn't pop
    // up the phone keyboard.
    closeBtn.addEventListener("click", () => {
      const fromKeyboard = closeBtn.matches(":focus-visible");
      hideBubble(bubble);
      if (fromKeyboard) userInput.focus();
    });

    container.appendChild(bubble);

    if (isLoading) {
      const spinAnim = getGlowSpin(bubble);
      if (spinAnim) {
        spinAnim.playbackRate = GLOW_LOADING_RATE;
        spinAnim.currentTime = GLOW_LOADING_PHASE * GLOW_REST_MS;
      }
    }

    // Trigger fade-in
    requestAnimationFrame(() => bubble.classList.add("show"));

    return bubble;
  }

  // Render the "Raffy Orbe" avatar/name header followed by the message text
  function setAIMessageContent(textElem, message) {
    textElem.innerHTML = "";

    const header = document.createElement("div");
    header.className = "chat-header";

    const avatar = document.createElement("img");
    avatar.src = "images/memojibadge.png";
    avatar.alt = "";
    avatar.className = "chat-avatar";

    const name = document.createElement("span");
    name.className = "chat-name";
    name.textContent = "Raffy Orbe";

    header.appendChild(avatar);
    header.appendChild(name);

    textElem.appendChild(header);
    textElem.appendChild(document.createTextNode(message));
  }
  // Swap the loading dots for the reply: the whole bubble, text included, fades up as one.
  // The glow keeps going, with its ring fading in and its speed easing down (settleGlow).
  function revealReply(bubble, message) {
    const textElem = bubble.querySelector(".chat-text");

    // While loading, the glow breathes (its clip's opacity is animated). Note where it is now,
    // so the opening swell below starts from there instead of snapping when that ends.
    const glowClip = bubble.querySelector(".chat-glow-clip");
    const breathingOpacity = glowClip ? getComputedStyle(glowClip).opacity : null;

    if (textElem) setAIMessageContent(textElem, message);

    // Whole-bubble fade-up (.chat-overlay.reply-in in styles/index.css). animationend also
    // bubbles up from the glow's own animations, so only react to the bubble's.
    bubble.classList.add("reply-in");
    bubble.addEventListener("animationend", function onEnd(e) {
      if (e.target !== bubble) return;
      bubble.removeEventListener("animationend", onEnd);
      bubble.classList.remove("reply-in");
    });

    bubble.classList.remove("loading");

    // Opening swell: from where the breathing was, up to a bit brighter than steady, then back
    // down to steady, alongside the ring fading in and the speed easing down.
    if (glowClip) swellGlow(bubble, breathingOpacity);

    settleGlow(bubble);
  }

  // Remove loading bubble
  function removeLoadingBubble() {
    const loading = overlayContainer.querySelector(".chat-overlay.loading");
    if (loading) {
      loading.remove();
      setHeroChatActive(false);
    }
  }

  // The chat request currently in flight, if any ({ controller, bubble }). While it exists the
  // send button acts as a stop button.
  let pendingRequest = null;

  function setSendButtonMode(isStop) {
    sendBtn.classList.toggle("is-stop", isStop);
    sendBtn.setAttribute("aria-label", isStop ? "Stop" : "Send");
  }

  // Stop button: cancel the API request and fade the loading bubble out like a close. Nothing
  // is shown in reply (sendMessage's catch sees the abort and stays quiet).
  function stopRequest() {
    if (!pendingRequest) return;
    const { controller, bubble } = pendingRequest;
    controller.abort();
    hideBubble(bubble);
  }

  // Only one chat shows at a time: an "Ask AI Raffy" question (askAI) closes the hero's chat,
  // stopping a reply that's still loading or fading out one that's showing. The stopped
  // message stays in the input, but focus stays put rather than jumping back to the hero.
  function closeHeroChat() {
    if (pendingRequest) {
      pendingRequest.handedOff = true;
      stopRequest();
    }
    const reply = overlayContainer.querySelector(".chat-overlay:not(.hide)");
    if (reply) hideBubble(reply);
  }

  // Send message
  async function sendMessage() {
    if (pendingRequest) return;

    const message = userInput.value.trim();
    if (!message) return;

    closeAskChat(); // one chat at a time

    // The input locks while the reply loads; the send button stays live as the stop button
    userInput.disabled = true;

    // Unlock audio playback now, while still inside the user gesture
    unlockReplySound();

    // Show loading bubble
    const bubble = addAIBubble("", true);
    const controller = new AbortController();
    pendingRequest = { controller, bubble };
    setSendButtonMode(true);

    // Bring the chat back front and center: on mobile the keyboard often scrolls the page down,
    // and disabling the input above dismisses it, so glide back to the top as the bubble appears
    window.scrollTo({ top: 0, behavior: "smooth" });

    let stopped = false;

    try {
      const response = await fetch("https://raffyorbe-github-io.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });

      const data = await response.json();
      const aiMessage = data.choices?.[0]?.message?.content || "Sorry, something went wrong. 😅";

      revealReply(bubble, aiMessage);
      playReplySound();
    }

    catch (error) {
      if (error.name === "AbortError") {
        // Stopped by the user: no reply, no error message, no sound
        stopped = true;
      } else {
        revealReply(bubble, "Error connecting to the server. 😵");
        playReplySound();

        console.error(error);
      }
    }

    finally {
      const handedOff = pendingRequest.handedOff; // stopped by an "Ask AI Raffy" question
      pendingRequest = null;
      setSendButtonMode(false);
      userInput.disabled = false;
      // A stopped message stays in the input so it can be edited and sent again
      if (!stopped) userInput.value = "";
      // Focus stays in the input (moving it to the reply's × on arrival was tried and dropped
      // as distracting). Esc closes the reply, and Tab reaches its ×.
      if (!handedOff) userInput.focus();
    }

  }

  // Placeholder change
  const input = document.getElementById("user-input");
  const placeholderEl = document.getElementById("placeholder");

  const placeholders = [
    "Ask me anything",
    "Try catching the light", // the hero light: catch it (glitching) and draw with it
    "Ask me how I design experiences",
    "Ask me how I integrate systems",
    "Ask me how I develop frontends",
    "Ask me about my skills",
    "Ask me about my work's impact",
    "Ask me how I collaborate",
    "Ask me about my work habits",
    "Ask me about my projects",
    "Ask me about my learning style",
    "Ask me what managers say about me"
  ];

  // Each line types out: one span per letter, each flashing in with the chat glow's colors and
  // cooling to the placeholder gray (placeholder-letter in styles/index.css), started TYPE_MS
  // after the one before. A line holds once typed, fades out, and the next one types in. The
  // first line types in with the chat bar's intro glow.
  const TYPE_MS = 35;       // ms between letters
  const LETTER_GLOW = 700;  // ms of each letter's flash, keep in step with .placeholder span
  const HOLD_MS = 1800;     // ms a fully typed line stays before fading out
  const FADE_MS = 400;      // .placeholder's opacity transition

  let index = 0;

  function typePlaceholder(text) {
    placeholderEl.replaceChildren(...[...text].map((ch, i) => {
      const letter = document.createElement("span");
      letter.textContent = ch;
      letter.style.animationDelay = `${i * TYPE_MS}ms`;
      return letter;
    }));
    setTimeout(rotatePlaceholder, text.length * TYPE_MS + LETTER_GLOW + HOLD_MS);
  }

  function hidePlaceholder() {
    placeholderEl.classList.add("hidden");
  }

  function showPlaceholder() {
    if (input.value === "") {
      placeholderEl.classList.remove("hidden");
    }
  }

  input.addEventListener("focus", hidePlaceholder);
  input.addEventListener("blur", showPlaceholder);

  // Phones: leaving the chat bar (the keyboard closes) glides back to the top, as sending a
  // message does, since the keyboard often leaves the page scrolled down. Except when the bar
  // was left for the nav bar: that's deliberate navigation, so its own jump always wins. A
  // touch on the nav bar is noted as it lands, before the input's blur.
  if (window.matchMedia("(hover: none)").matches) {
    let navTouchedAt = 0;
    const navBar = document.querySelector(".floating-navbar");
    const noteNav = () => { navTouchedAt = performance.now(); };
    if (navBar) {
      navBar.addEventListener("touchstart", noteNav, { passive: true });
      navBar.addEventListener("click", noteNav);
    }
    input.addEventListener("blur", () => {
      setTimeout(() => {
        if (performance.now() - navTouchedAt < 800) return;
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 150);
    });
  }

  // Hold the current line while something is typed in the input, and while the chat bar is
  // off screen or the tab is hidden, so the glowing type-out doesn't keep restyling unseen
  // letters while you read further down
  let placeholderOnScreen = true;
  new IntersectionObserver((entries) => {
    placeholderOnScreen = entries[0].isIntersecting;
  }).observe(placeholderEl);

  function rotatePlaceholder() {
    if (input.value !== "" || !placeholderOnScreen || document.hidden) {
      setTimeout(rotatePlaceholder, 1000);
      return;
    }
    placeholderEl.classList.add("hidden");
    setTimeout(() => {
      index = (index + 1) % placeholders.length;
      typePlaceholder(placeholders[index]);
      if (input !== document.activeElement) placeholderEl.classList.remove("hidden");
    }, FADE_MS);
  }

  if (chatBarGlowStarted || !glow) {
    typePlaceholder(placeholders[index]);
  } else {
    document.addEventListener("chatbarglowstart", () => typePlaceholder(placeholders[index]), { once: true });
  }

  // The input's cursor glows like a placeholder letter at its brightest. Browsers can only
  // recolor the native caret, so it's hidden (caret-color: transparent) and a glowing bar is
  // drawn at its place instead: the width of the text before the caret, measured by a hidden
  // copy of it in the input's font (canvas measureText came out a few px short in Safari),
  // less however far long text has scrolled. While the input is focused, a frame
  // loop checks for changes (typing, arrow keys, taps, and the script's own value changes,
  // which fire no events) and moves it. It holds steady while it moves and starts blinking
  // after a pause, like a native caret, and hides while text is selected.
  const inputCursor = document.createElement("span");
  inputCursor.className = "input-cursor";
  inputCursor.setAttribute("aria-hidden", "true");
  input.after(inputCursor);
  input.classList.add("custom-caret");
  const measurer = document.createElement("span");
  measurer.setAttribute("aria-hidden", "true");
  measurer.style.cssText = "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;pointer-events:none";
  document.body.appendChild(measurer);
  let cursorRaf = null;
  let cursorKey = "";
  let cursorBlinkTimer = null;

  function placeInputCursor() {
    cursorRaf = requestAnimationFrame(placeInputCursor);
    const show = !input.disabled && input.selectionStart === input.selectionEnd;
    const key = `${show}|${input.value}|${input.selectionStart}|${input.scrollLeft}|${input.offsetWidth}`;
    if (key === cursorKey) return;
    cursorKey = key;
    inputCursor.classList.toggle("visible", show);
    if (!show) return;
    const cs = getComputedStyle(input);
    ["fontFamily", "fontSize", "fontWeight", "fontStretch", "fontVariationSettings", "letterSpacing", "wordSpacing", "textTransform"]
      .forEach((prop) => { measurer.style[prop] = cs[prop]; });
    measurer.textContent = input.value.slice(0, input.selectionStart);
    const textW = measurer.getBoundingClientRect().width;
    const left = input.offsetLeft + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
    const right = input.offsetLeft + input.offsetWidth - parseFloat(cs.paddingRight);
    const x = Math.min(left + textW - input.scrollLeft, right);
    inputCursor.style.transform = `translate(${x - 1}px, -50%)`;
    inputCursor.classList.remove("blink");
    clearTimeout(cursorBlinkTimer);
    cursorBlinkTimer = setTimeout(() => inputCursor.classList.add("blink"), 500);
  }

  input.addEventListener("focus", () => {
    cursorKey = "";
    if (cursorRaf === null) placeInputCursor();
  });
  input.addEventListener("blur", () => {
    cancelAnimationFrame(cursorRaf);
    cursorRaf = null;
    clearTimeout(cursorBlinkTimer);
    inputCursor.classList.remove("visible", "blink");
  });

  // Talent model modal (#skills-dialog, opened by "View talent model"). It fades up like the chat
  // bubble, and its glow opens the way a landing reply's does: spinning at the loading pace and
  // easing down (settleGlow), the ring fading in, and the swell (swellGlow).
  //
  // Opened with show(), not showModal(): with a modal dialog open, iOS Safari paints its status
  // bar and bottom toolbar solid black instead of showing the (frosted) page under them, even
  // with no dim and the dialog clear of the screen edges (checked in the iOS 26.4 simulator).
  // So what showModal() did for free is done here: the rest of the page is made inert (no
  // clicks, and Tab stays in the modal), Esc closes it, focus moves into it and goes back to
  // the link afterwards, and it sits above the navbar (z-index in styles/index.css).
  // A fixed layer reaching the screen's edge does the same, so the dim and blur are a separate
  // in-page layer (#skills-scrim), placed over the visible area when the modal opens.
  const skillsDialog = document.getElementById("skills-dialog");
  const skillsScrim = document.getElementById("skills-scrim");
  const skillsPanel = skillsDialog.querySelector(".skills-modal");
  const skillsBody = skillsDialog.querySelector(".skills-body");
  let skillsClosing = false;
  let skillsReturnFocus = null;

  // Keeps the scrim over the visible area (200px margin above and below the view), in case the
  // page still moves while the modal is open (a scroll in progress, or a rubber-band bounce)
  function placeSkillsScrim() {
    skillsScrim.style.top = `${window.scrollY - 200}px`;
  }

  function setPageInert(inert) {
    for (const el of document.body.children) {
      if (el !== skillsDialog && el !== skillsScrim && el.tagName !== "SCRIPT") el.inert = inert;
    }
  }

  function openSkills() {
    if (skillsDialog.open) return;
    skillsReturnFocus = document.activeElement;
    skillsPanel.classList.add("glow-intro");
    placeSkillsScrim();
    window.addEventListener("scroll", placeSkillsScrim, { passive: true });
    skillsScrim.classList.add("open");
    skillsDialog.show();
    setPageInert(true);
    document.documentElement.classList.add("skills-open");
    // Focus the content (no ring) rather than the ×, which Tab reaches
    skillsBody.focus({ preventScroll: true });

    const spinAnim = getGlowSpin(skillsPanel);
    if (spinAnim) spinAnim.playbackRate = GLOW_LOADING_RATE;

    skillsPanel.getBoundingClientRect(); // lay out the hidden state first so the fade-up runs
    skillsDialog.classList.add("show");
    skillsScrim.classList.add("show");
    skillsPanel.classList.remove("glow-intro");
    swellGlow(skillsPanel, 0);
    settleGlow(skillsPanel);
  }

  function closeSkills() {
    if (!skillsDialog.open || skillsClosing) return;
    skillsClosing = true;
    skillsDialog.classList.remove("show");
    skillsScrim.classList.remove("show");

    // Close once the panel has slid down (its parts fade alongside). transitionend also
    // bubbles up from those parts, so only react to the panel's own; the timeout covers a
    // transition that never runs.
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      skillsPanel.removeEventListener("transitionend", onEnd);
      skillsDialog.close();
      skillsScrim.classList.remove("open");
      window.removeEventListener("scroll", placeSkillsScrim);
      setPageInert(false);
      document.documentElement.classList.remove("skills-open");
      skillsClosing = false;
      if (skillsReturnFocus && skillsReturnFocus.focus) skillsReturnFocus.focus({ preventScroll: true });
      skillsReturnFocus = null;
    };
    const onEnd = (e) => {
      if (e.target === skillsPanel && e.propertyName === "transform") finish();
    };
    skillsPanel.addEventListener("transitionend", onEnd);
    setTimeout(finish, 500);
  }

  document.getElementById("skills-open").addEventListener("click", openSkills);
  skillsDialog.querySelector(".skills-close").addEventListener("click", closeSkills);

  // Esc closes it (a non-modal dialog gets no "cancel" event). Tab (and Safari's Option-Tab)
  // wraps around inside the modal instead of leaving the page: the page behind is inert, so
  // otherwise each press past the last control went out to the browser, which Safari shows as a
  // highlight around the whole page (and the first press from the content, which comes after
  // the × in the markup, did that before reaching the ×).
  document.addEventListener("keydown", (e) => {
    if (!skillsDialog.open) return;
    if (e.key === "Escape") {
      closeSkills();
      return;
    }
    if (e.key !== "Tab") return;
    const stops = [...skillsDialog.querySelectorAll("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])")]
      .filter((el) => !el.disabled);
    if (!stops.length) return;
    e.preventDefault();
    const i = stops.indexOf(document.activeElement);
    const next = e.shiftKey
      ? stops[i <= 0 ? stops.length - 1 : i - 1]
      : stops[i === -1 || i === stops.length - 1 ? 0 : i + 1];
    next.focus();
  });

  // A click on the dimmed area around the panel (the dialog itself, or the scrim past its
  // edges) closes it too
  skillsDialog.addEventListener("click", (e) => {
    if (e.target === skillsDialog) closeSkills();
  });
  skillsScrim.addEventListener("click", closeSkills);






  // Event listeners
  sendBtn.addEventListener("click", () => (pendingRequest ? stopRequest() : sendMessage()));

  // Esc closes a reply bubble (like its × button) and puts focus back in the chat input.
  // While loading there's no ×; the send button's stop handles that.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (skillsDialog.open) return; // that Esc closes the skills modal instead
    // An "Ask AI Raffy" reply first: it floats over everything (one still loading can't be
    // stopped, see askAI)
    const asked = askContainer.querySelector(".chat-overlay.show:not(.loading):not(.hide)");
    if (asked) {
      hideBubble(asked);
      return;
    }
    const reply = overlayContainer.querySelector(".chat-overlay.show:not(.loading):not(.hide)");
    if (!reply) return;
    hideBubble(reply);
    userInput.focus();
  });

  // "Ask AI Raffy" buttons (under the Skills and Projects links). Each sends its question
  // (data-question) to AI Raffy without leaving the section: the loading dots and the reply
  // fade in just under the navbar, with no frosted layer. Separate from the hero's chat: its
  // own request. No stop button while a reply loads (like asking Siri): the question was
  // asked on purpose, and the page can be scrolled and used meanwhile. The reply's × closes it.
  // Only one chat shows at a time, though: another question replaces it, even mid-load, and
  // sending from the hero's chat closes it (closeAskChat).
  const askContainer = document.createElement("div");
  askContainer.className = "ask-ai-chat";
  document.body.appendChild(askContainer);
  const navWrapper = document.querySelector(".home-border-wrapper");
  let askPending = null; // the AbortController of the reply while it loads

  function closeAskChat() {
    if (askPending) {
      askPending.abort();
      askPending = null;
    }
    const asked = askContainer.querySelector(".chat-overlay:not(.hide)");
    if (asked) hideBubble(asked);
  }

  // Sits 12px under the navbar, whose height changes with the screen size, and as wide as
  // the hero's chat bubbles (the chat bar's width). Measured again whenever either changes
  // size, so a bubble that's open while the window resizes or a phone rotates keeps fitting
  // the screen.
  function placeAskContainer() {
    if (navWrapper) askContainer.style.top = `${navWrapper.getBoundingClientRect().bottom + 12}px`;
    askContainer.style.width = `${overlayContainer.getBoundingClientRect().width}px`;
  }
  const askPlacer = new ResizeObserver(placeAskContainer);
  askPlacer.observe(overlayContainer);
  if (navWrapper) askPlacer.observe(navWrapper);

  async function askAI(question) {
    // One chat at a time: drop a previous question's reply that's still loading (its bubble
    // is replaced below) and close the hero's chat
    if (askPending) askPending.abort();
    closeHeroChat();

    placeAskContainer();

    // Unlock audio playback now, while still inside the click
    unlockReplySound();

    const bubble = addAIBubble("", true, askContainer);
    const controller = new AbortController();
    askPending = controller;

    try {
      const response = await fetch("https://raffyorbe-github-io.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
        signal: controller.signal,
      });

      const data = await response.json();
      const aiMessage = data.choices?.[0]?.message?.content || "Sorry, something went wrong. 😅";

      revealReply(bubble, aiMessage);
      playReplySound();
    }

    catch (error) {
      if (error.name === "AbortError") return; // replaced by another chat: nothing to show
      revealReply(bubble, "Error connecting to the server. 😵");
      playReplySound();
      console.error(error);
    }

    finally {
      if (askPending === controller) askPending = null;
    }
  }

  document.querySelectorAll(".ask-ai").forEach((wrap) => {
    const btn = wrap.querySelector("button");
    const askGlow = wrap.querySelector(".chat-bar-glow");
    const askCore = wrap.querySelector(".chat-bar-core");

    btn.addEventListener("click", () => askAI(btn.dataset.question));

    // The chat bar's intro glow, sized for the button (8px peak spread, the bar's is 12px),
    // replayed on each hover and on keyboard focus
    const playGlow = () => playIntroGlow(askGlow, askCore, 8);
    btn.addEventListener("mouseenter", playGlow);
    btn.addEventListener("focus", () => {
      if (btn.matches(":focus-visible")) playGlow();
    });
  });

  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  // Egg
  // const egg = document.getElementById("egg");
  // const eggmsg = egg.querySelector(".eggmsg");
  // const eggIcon = document.getElementById("eggIcon");

  // egg.addEventListener("click", () => {
  //   eggIcon.textContent = "🦖";
  //   eggmsg.classList.add("show");

  //   setTimeout(() => {
  //     eggmsg.classList.remove("show");
  //     eggIcon.textContent = "🥚";
  //   }, 3000);
  // });

  // Hero T-rex: the pixel T-rex on the chat bar is wary of the hero light (it does look like a
  // meteor). When someone catches the light and drags it close, it panics: it turns its back
  // on the light and runs in place, then calms down a moment after and faces left again. The
  // hero light's draw loop below feeds it the light's position each frame, so it reacts only
  // while the light is running (never under reduced motion). Watching the light pass (turning toward it, looking up) was tried and dropped.
  const dino = document.querySelector(".chat-dino");
  let dinoSeesLight = () => {};
  if (dino) {
    const PANIC_RANGE = 200; // px from the T-rex at which a caught light sets off a panic
    const PANIC_HOLD = 900;  // ms it keeps panicking after the light is let go or pulled away
    let calmTimer = null;

    // x, y: the light's head in client px; lit: whether it's showing; caught: held by a cursor
    // or finger. Does nothing (not even a layout read) unless the light is caught.
    dinoSeesLight = (x, y, lit, caught) => {
      if (!lit || !caught) return;
      const r = dino.getBoundingClientRect();
      const dx = x - (r.left + r.width / 2);
      if (Math.hypot(dx, y - (r.top + r.height / 2)) >= PANIC_RANGE) return;
      dino.classList.add("is-panicking");
      // Runs away from the light: faces right when it's on the left. Right above it (within a
      // few px either way) it keeps the way it's facing, so it doesn't flicker.
      if (Math.abs(dx) > 8) dino.classList.toggle("faces-right", dx < 0);
      clearTimeout(calmTimer);
      calmTimer = setTimeout(() => dino.classList.remove("is-panicking", "faces-right"), PANIC_HOLD);
    };
  }

  // Hero light trail: a glowing streak that follows the cursor across the black hero, white at
  // the head and cooling through the chat glow's colors as it fades. Points are drawn as
  // pre-rendered soft dots with additive blending, and the loop stops once the trail has
  // faded, so an idle hero costs nothing.
  // The trail drifts on its own (starting once the chat bar's intro glow has finished,
  // launching out from behind the center of the chat bar as if the intro's energy escaped; it
  // flies back into the bar while the bar is in use) along a wandering path. Its head can be
  // caught, with a mouse or a finger, and dragged to draw (the catch sets off the hero wave);
  // let go, it glides back into the drift. The drift
  // only runs while the hero is on screen and the tab is visible. While a chat bubble is
  // showing, the trail is paused on every device.
  // Whether a press at a point would catch the light (set by the hero light below). The hero
  // glitch skips those presses: a catch's cue is the character wave, not a glitch.
  let pressCatchesLight = () => false;
  const glowCell = document.querySelector(".home-cell");
  const glowCanvas = glowCell && glowCell.querySelector(".home-glow");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (glowCanvas && !reduceMotion) {
    const ctx = glowCanvas.getContext("2d");
    const TRAIL_LIFE = 900;   // ms a trail point takes to fade out
    const SPACING = 6;        // px between interpolated points, so fast moves stay continuous
    const HEAD_RADIUS = 72;   // px, the streak's width at the head (it was 90 when it followed the cursor)
    const HALO_RADIUS = 380;  // px, the wide dim light around the head
    // Head-to-tail colors: the chat glow's ring (.chat-glow-color), read backwards from its
    // white, so the trail cycles through every glow color with white leading
    const TRAIL_COLORS = ["#ffffff", "#ffd9a8", "#ff9d52", "#6a1fd0", "#5a2fd0", "#d089ff"];

    // One soft radial dot per color, drawn once and stamped with drawImage
    function makeDot(color) {
      const size = 128;
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const g = c.getContext("2d");
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, color);
      grad.addColorStop(0.35, color + "66");
      grad.addColorStop(1, color + "00");
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      return c;
    }
    const dots = TRAIL_COLORS.map(makeDot);
    const haloDot = makeDot("#d089ff");

    let points = [];          // { x, y, t } in CSS px relative to the canvas
    let head = null;          // last pointer position, for the halo
    let headAlpha = 0;        // halo fades in on enter, out on leave
    let pointerInside = false;
    let rafId = null;

    // Touch-only devices (phones, tablets without a mouse)
    const touchOnly = window.matchMedia("(hover: none)").matches;
    // The drift moves fast and draws a slimmer streak with a smaller halo, so on a phone it
    // reads as sweeping lines of light rather than a floating circle
    const DRIFT_SPEED = 3;
    // Where along its path the drift starts, picked at random on every launch. The path is a
    // function of time, and the page clock restarts at 0 on every load, so without this the
    // light traced the same path every visit.
    let driftPhase = Math.random() * 1000;
    const headRadius = touchOnly ? 55 : HEAD_RADIUS;
    const haloRadius = touchOnly ? 260 : HALO_RADIUS;
    // Each dot's strength (0.12 suited the original 90px desktop streak; the slimmer streaks
    // stack fewer dots, so they need more)
    const streakAlpha = touchOnly ? 0.2 : 0.18;
    const haloAlpha = 0.3;   // the halo's strength, the same everywhere (web was 0.22)
    let heroVisible = false;
    // While a chat bubble is showing, the trail is paused (no cursor, finger or drift) and
    // whatever is lit fades out, so the focus stays on the chat. It picks up again once the
    // bubble closes.
    let chatActive = false;
    document.addEventListener("herochatchange", (e) => {
      chatActive = e.detail.active;
      if (chatActive) {
        pointerInside = false;
        fingerDown = false;
        release = null;
        recall = null; // a chat switches the drift off at once, no flight back into the bar
      } else {
        launchNext = true; // the chat closed: relaunch from the bar
      }
      start(); // fades out what's lit, or restarts the drift
    });

    // The drift waits for the chat bar's intro glow to finish, so the two don't compete
    let introDone = chatBarGlowDone;
    document.addEventListener("chatbarglowdone", () => {
      introDone = true;
      start();
    });
    let fingerDown = false;
    let release = null;        // { x, y, t, launch } where the glide back into the drift starts
    const DRIFT_RETURN = 1200; // ms to glide from the lifted finger back onto the drift path
    const DRIFT_LAUNCH = 1600; // ms for the launch out from behind the chat bar to join the path
    const chatBar = document.querySelector(".floating-chatbar");
    let wasDrifting = false;

    // The drift launches from behind the center of the chat bar on a fresh load, after a chat
    // closes, and when the user leaves the chat bar. The bar covers the canvas there, so the
    // light seems to escape from behind it. Coming back to the hero (a scroll, the tab) it just
    // picks up its path again, and a finger lift glides from the finger.
    let launchNext = true;

    function chatBarCenter() {
      const b = chatBar.getBoundingClientRect();
      const c = glowCanvas.getBoundingClientRect();
      return { x: b.left + b.width / 2 - c.left, y: b.top + b.height / 2 - c.top };
    }

    function launchFromChatBar(now) {
      if (!chatBar) return;
      const at = chatBarCenter();
      points = []; // no streak back to wherever the trail last was
      driftPhase = Math.random() * 1000; // a fresh path every launch
      release = { x: at.x, y: at.y, t: now, launch: true };
    }

    // While the user is in the chat bar (they tapped it), the drift flies back into the bar's
    // center and goes out, as if returning to where it came from; leaving the bar launches it
    // again. Only a tap, click or Tab into it counts: the script's own focus() calls (after a
    // reply, on Esc) don't. A chat (loading or reply, with the frost) switches it off at once instead.
    const DRIFT_RECALL = 900;  // ms to fly back into the chat bar
    let barActive = false;
    let recall = null;         // { x, y, t } where the flight back into the bar starts
    if (chatBar) {
      const barInput = chatBar.querySelector("input");
      function useBar() {
        if (barActive) return;
        const wasOut = isDrifting(); // checked before the bar counts as active, which ends it
        barActive = true;
        if (wasOut && head) {
          recall = { x: head.x, y: head.y, t: performance.now() };
          release = null;
          start();
        }
      }
      function leaveBar() {
        if (!barActive) return;
        barActive = false;
        recall = null;
        launchNext = true;
        start();
      }
      chatBar.addEventListener("touchstart", useBar, { passive: true });
      // A mouse focuses the input on press, so a press that leaves it unfocused (on the bar's
      // padding) wasn't using the bar: send the light back out. (A tap focuses on release, so
      // touch can't be checked this way.)
      chatBar.addEventListener("mousedown", () => {
        useBar();
        setTimeout(() => {
          if (document.activeElement !== barInput) leaveBar();
        }, 0);
      });
      // Tabbing into the input uses the bar too. Only a Tab counts, so the script's own
      // focus() calls (after a reply, on Esc) still don't.
      let tabbing = false;
      document.addEventListener("keydown", (e) => { if (e.key === "Tab") tabbing = true; });
      document.addEventListener("keyup", (e) => { if (e.key === "Tab") tabbing = false; });
      barInput.addEventListener("focus", () => {
        if (tabbing) useBar();
      });
      barInput.addEventListener("blur", leaveBar);
    }
    let cssW = 0;
    let cssH = 0;
    // The canvas only holds soft gradients, so it renders at half the CSS size and the browser
    // scales it up. Looks the same, but uses a quarter of the memory of 1x (a sixteenth of a
    // 2x retina canvas), e.g. about 1.2MB instead of 20MB on a 1440×900 retina hero.
    const scale = 0.5;

    function resize() {
      const r = glowCanvas.getBoundingClientRect();
      cssW = r.width;
      cssH = r.height;
      glowCanvas.width = Math.round(r.width * scale);
      glowCanvas.height = Math.round(r.height * scale);
    }
    resize();
    window.addEventListener("resize", resize);

    function addPoint(clientX, clientY) {
      const r = glowCanvas.getBoundingClientRect();
      addPointAt(clientX - r.left, clientY - r.top, performance.now());
      pointerInside = true;
      start();
    }

    // x, y in CSS px relative to the canvas
    function addPointAt(x, y, now) {
      const last = points[points.length - 1];
      if (last && now - last.t < TRAIL_LIFE) {
        const dist = Math.hypot(x - last.x, y - last.y);
        const steps = Math.min(Math.floor(dist / SPACING), 60);
        for (let i = 1; i < steps; i++) {
          const f = i / steps;
          points.push({ x: last.x + (x - last.x) * f, y: last.y + (y - last.y) * f, t: last.t + (now - last.t) * f });
        }
      }
      points.push({ x, y, t: now });
      head = { x, y };
    }

    function isDrifting() {
      return introDone && heroVisible && !chatActive && !fingerDown && !document.hidden &&
        (!barActive || recall !== null);
    }

    // A slow wandering path: two sine waves per axis at unrelated speeds, so it never visibly
    // repeats. Roughly 300–750px/s on a phone.
    function driftPosition(now) {
      if (recall) {
        // Flying back into the chat bar (ease-in-out, so it visibly sets off at once and slips
        // in behind the bar), then the drift ends. A cubic ease-in was tried: it sat still for
        // the first half and read as a fade, not a return.
        const to = chatBarCenter();
        const k = Math.min(1, (now - recall.t) / DRIFT_RECALL);
        const e = k * k * (3 - 2 * k);
        const pos = { x: recall.x + (to.x - recall.x) * e, y: recall.y + (to.y - recall.y) * e };
        if (k === 1) recall = null;
        return pos;
      }
      const t = (now / 1000) * DRIFT_SPEED + driftPhase;
      const x = cssW * (0.5 + 0.36 * Math.sin(t * 0.53) + 0.08 * Math.sin(t * 1.37 + 2));
      const y = cssH * (0.45 + 0.26 * Math.sin(t * 0.71 + 1) + 0.06 * Math.sin(t * 1.73));
      if (!release) return { x, y };
      // Glide from the launch point or the lifted finger onto the path. The launch eases out
      // (it bursts out fast, then settles into the drift); a finger lift uses a smoothstep.
      const k = Math.min(1, (now - release.t) / (release.launch ? DRIFT_LAUNCH : DRIFT_RETURN));
      const e = release.launch ? 1 - Math.pow(1 - k, 3) : k * k * (3 - 2 * k);
      const pos = { x: release.x + (x - release.x) * e, y: release.y + (y - release.y) * e };
      if (k === 1) release = null;
      return pos;
    }

    function start() {
      if (rafId === null) rafId = requestAnimationFrame(draw);
    }

    function draw(now) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, glowCanvas.width, glowCanvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.globalCompositeOperation = "lighter";

      const drifting = isDrifting();
      if (drifting && !wasDrifting && !release && !recall) {
        if (launchNext) launchFromChatBar(now);
        else points = []; // resuming its path elsewhere: no streak from where it last was
        launchNext = false;
      }
      wasDrifting = drifting;
      if (drifting) {
        const d = driftPosition(now);
        addPointAt(d.x, d.y, now);
      } else if (fingerDown && head) {
        // Keep a finger that's held still glowing (touch events only fire on movement)
        addPointAt(head.x, head.y, now);
      }

      // Wide dim halo lighting the area around the cursor
      const haloTarget = pointerInside || drifting ? 1 : 0;
      headAlpha += (haloTarget - headAlpha) * 0.08;
      if (Math.abs(haloTarget - headAlpha) < 0.01) headAlpha = haloTarget;
      if (head && headAlpha > 0.01) {
        ctx.globalAlpha = haloAlpha * headAlpha;
        ctx.drawImage(haloDot, head.x - haloRadius, head.y - haloRadius, haloRadius * 2, haloRadius * 2);
      }
      // The T-rex panics at a caught light dragged close (see the hero T-rex above)
      if (head && grabbing) {
        const r = glowCanvas.getBoundingClientRect();
        dinoSeesLight(r.left + head.x, r.top + head.y, headAlpha > 0.3, grabbing);
      }

      // The streak, oldest first so the bright head lands on top
      points = points.filter(p => now - p.t < TRAIL_LIFE);
      for (const p of points) {
        // 0 at the head, 1 at the tail. The frame's timestamp can be slightly older than the
        // newest event's, so clamp at 0.
        const age = Math.max(0, (now - p.t) / TRAIL_LIFE);
        const fade = Math.pow(1 - age, 1.4);
        const radius = headRadius * (1 - age * 0.4);
        // Cross-fade between the two nearest colors so the streak shifts smoothly
        const pos = age * (dots.length - 1);
        const i = Math.min(Math.floor(pos), dots.length - 2);
        const mix = pos - i;
        // Stamps too faint to show (the tail's end, the far side of a cross-fade) are skipped
        const a0 = streakAlpha * fade * (1 - mix);
        const a1 = streakAlpha * fade * mix;
        if (a0 > 0.002) {
          ctx.globalAlpha = a0;
          ctx.drawImage(dots[i], p.x - radius, p.y - radius, radius * 2, radius * 2);
        }
        if (a1 > 0.002) {
          ctx.globalAlpha = a1;
          ctx.drawImage(dots[i + 1], p.x - radius, p.y - radius, radius * 2, radius * 2);
        }
      }
      ctx.globalAlpha = 1;

      // Keep going while the trail is fading or the halo is still easing in or out. Once both
      // settle the canvas keeps its last frame, so a resting cursor costs nothing.
      if (points.length || headAlpha !== haloTarget || drifting || fingerDown) {
        rafId = requestAnimationFrame(draw);
      } else {
        rafId = null;
      }
    }

    // Listen on the whole document and test against the hero's box, rather than listening on
    // the hero itself, so the floating navbar (which sits over the hero but lives outside it)
    // counts as hero area too and the trail keeps going under it.
    function inHero(clientX, clientY) {
      const r = glowCell.getBoundingClientRect();
      return clientX >= r.left && clientX < r.right && clientY >= r.top && clientY < r.bottom;
    }

    // Catching the light, the same with a mouse or a finger: a press on the light's head (not on
    // a link, button, the chat bar or a bubble) grabs it, and it follows the cursor or finger,
    // drawing, until it's let go or leaves the hero; then it glides back into the drift. The
    // catch sets off a wave of characters (the hero wave below) instead of a glitch. Anywhere
    // else, a press glitches, and a finger scrolls the page as usual.
    let grabbing = false;
    let grabTouch = null;     // the finger holding the light, by touch identifier
    const CATCH = 0.9;        // the catch reaches 0.9x the head's radius: aim for the bright core
    const TOUCH_CATCH = 1.5;  // a fingertip is less precise than a cursor: a wider catch
    function overHead(clientX, clientY, reach = 1) {
      if (!head || !isDrifting()) return false;
      const r = glowCanvas.getBoundingClientRect();
      return Math.hypot(clientX - r.left - head.x, clientY - r.top - head.y) <= headRadius * CATCH * reach;
    }
    function onControl(target) {
      return target.closest && target.closest("a, button, input, .chat-glass, .chat-overlay, .floating-navbar");
    }
    pressCatchesLight = (clientX, clientY, touch) =>
      !grabbing && !chatActive && inHero(clientX, clientY) && overHead(clientX, clientY, touch ? TOUCH_CATCH : 1);
    function grab(clientX, clientY) {
      grabbing = true;
      fingerDown = true;
      release = null;
      glowCell.classList.remove("hero-grabbable");
      document.documentElement.classList.add("hero-grabbing");
      addPoint(clientX, clientY);
      // A catch sets off the character wave (see the hero wave below)
      document.dispatchEvent(new CustomEvent("herocatch", { detail: { x: clientX, y: clientY } }));
    }
    function letGo() {
      if (!grabbing) return;
      grabbing = false;
      grabTouch = null;
      fingerDown = false;
      pointerInside = false;
      document.documentElement.classList.remove("hero-grabbing");
      if (head) release = { x: head.x, y: head.y, t: performance.now() };
      start();
    }
    function dragTo(clientX, clientY) {
      if (chatActive || !inHero(clientX, clientY)) letGo();
      else addPoint(clientX, clientY);
    }

    // Mouse: a grab cursor shows over the head; while it's held, a grabbing cursor everywhere
    // and no text selection
    const isMouse = (e) => e.pointerType === "mouse" || e.pointerType === "pen";
    document.addEventListener("pointerdown", (e) => {
      if (!isMouse(e) || e.button !== 0 || chatActive || onControl(e.target)) return;
      if (!inHero(e.clientX, e.clientY) || !overHead(e.clientX, e.clientY)) return;
      e.preventDefault();
      grab(e.clientX, e.clientY);
    });
    document.addEventListener("pointermove", (e) => {
      if (!isMouse(e)) return;
      if (grabbing) {
        dragTo(e.clientX, e.clientY);
        return;
      }
      glowCell.classList.toggle("hero-grabbable",
        !chatActive && inHero(e.clientX, e.clientY) && !onControl(e.target) && overHead(e.clientX, e.clientY));
    });
    document.addEventListener("pointerup", (e) => { if (isMouse(e)) letGo(); });
    document.addEventListener("pointercancel", (e) => { if (isMouse(e)) letGo(); });
    window.addEventListener("blur", letGo);

    // Touch: touch events on the hero, not pointer events (those are cancelled once a scroll
    // starts). They aren't passive, so a touch that catches the light can cancel its default
    // and the page doesn't scroll while the light is held. They're on the hero alone, so
    // touches elsewhere on the page never wait on this script.
    glowCell.addEventListener("touchstart", (e) => {
      if (grabbing || chatActive || e.touches.length !== 1 || onControl(e.target)) return;
      const t = e.touches[0];
      if (!inHero(t.clientX, t.clientY) || !overHead(t.clientX, t.clientY, TOUCH_CATCH)) return;
      e.preventDefault();
      grabTouch = t.identifier;
      grab(t.clientX, t.clientY);
    }, { passive: false });
    glowCell.addEventListener("touchmove", (e) => {
      if (grabTouch === null) return;
      const t = [...e.changedTouches].find((touch) => touch.identifier === grabTouch);
      if (!t) return;
      e.preventDefault();
      dragTo(t.clientX, t.clientY);
    }, { passive: false });
    function onTouchEnd(e) {
      if (grabTouch !== null && [...e.changedTouches].some((touch) => touch.identifier === grabTouch)) letGo();
    }
    glowCell.addEventListener("touchend", onTouchEnd);
    glowCell.addEventListener("touchcancel", onTouchEnd);

    // Run the drift only while the hero is on screen and the tab is visible. The draw loop
    // stops by itself once isDrifting() turns false and the trail fades.
    new IntersectionObserver((entries) => {
      heroVisible = entries[0].isIntersecting;
      if (heroVisible) start();
    }).observe(glowCell);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) start();
    });
  }


  // Hero glitch: a click or tap on the hero (not on its controls) glitches a piece of pixel art
  // into view at that point, in the style of Watch Dogs 2's DedSec art: a 1-bit sprite in one
  // loud color with a halftone shadow, torn into horizontal slices that jump sideways (some
  // flashing to the sprite cut out of a solid block), a white ghost copy, stray color bars and
  // flicker. It holds for a moment, then
  // tears apart and drops out. Each press picks a random sprite (things Raffy likes) and a
  // random color, never the same as the last one. Drawn on its own canvas, only while a glitch
  // is playing. Off during a chat, and under prefers-reduced-motion.
  const glitchCanvas = document.querySelector(".home-glitch");
  if (glitchCanvas && glowCell && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const gctx = glitchCanvas.getContext("2d");
    const GLITCH_LIFE = 1300;   // ms from first flicker to gone
    const GLITCH_IN = 220;      // ms of heavy glitching on arrival
    const GLITCH_OUT = 340;     // ms of tearing apart at the end
    const GLITCH_STEP = 45;     // ms each glitch state holds (choppy, like dropped frames)
    const SPRITE_PX = 168;      // target sprite width in CSS px (phones get a bit smaller)
    const PAD = 2;              // sprite px around the sprite (room for its shadow and the block's edge)
    // Sampled from Watch Dogs 2 DedSec art (cyan, acid green, violet, amber) plus its hot pink
    const GLITCH_COLORS = ["#0acbfd", "#a8fe01", "#bc02fd", "#feb606", "#ff2a8c"];
    // 1-bit pixel art, "#" is a lit pixel. Each row of a sprite is the same length.
    const SPRITES = {
      dino: [
        "........########",
        ".......##.######",
        ".......#########",
        ".......#########",
        ".......#####....",
        ".......########.",
        "#.....#####.....",
        "#....#######....",
        "##..##########..",
        "###########.#...",
        "###########.....",
        ".#########......",
        "..#######.......",
        "...###.##.......",
        "...##...#.......",
        "...#....##......",
      ],
      // A classic five-point star
      star: [
        "........#........",
        "........#........",
        ".......###.......",
        ".......###.......",
        "......#####......",
        "#################",
        ".###############.",
        "...###########...",
        "....#########....",
        ".....#######.....",
        ".....#######.....",
        "....#########....",
        "....####.####....",
        "...####...####...",
        "...###.....###...",
        "..##.........##..",
      ],
      // The 👾 alien monster
      invader: [
        "..##.....##..",
        "...##...##...",
        "..#########..",
        ".###########.",
        "###..###..###",
        "###..###..###",
        "#############",
        "#.#########.#",
        "#.#.......#.#",
        "...##...##...",
      ],
      rocket: [
        ".....#.....",
        "....###....",
        "...#####...",
        "...#####...",
        "..###.###..",
        "..##...##..",
        "..###.###..",
        "..#######..",
        "..#######..",
        ".#.#####.#.",
        "##.#####.##",
        "##.#####.##",
        "#...###...#",
        "...........",
        "....#.#....",
        ".....#.....",
      ],
      music: [
        "....##########",
        "....##########",
        "....##......##",
        "....##......##",
        "....##......##",
        "....##......##",
        "....##......##",
        "....##......##",
        "....##......##",
        "..####....####",
        ".#####...#####",
        "######..######",
        "######..######",
        ".####....####.",
        "..##......##..",
      ],
      bunny: [
        ".##......##.",
        "####....####",
        "####....####",
        "####....####",
        ".###....###.",
        ".###....###.",
        ".##########.",
        "############",
        "##.######.##",
        "############",
        "#####..#####",
        ".####..####.",
        "..########..",
        ".##########.",
        "############",
        "####....####",
      ],
      laptop: [
        "..############..",
        "..############..",
        "..##........##..",
        "..##.#......##..",
        "..##..#.....##..",
        "..##.#..##..##..",
        "..##........##..",
        "..############..",
        ".##############.",
        "################",
        "######....######",
        "################",
      ],
      frog: [
        "..###......###..",
        ".#####....#####.",
        ".##.##....##.##.",
        ".#####....#####.",
        "################",
        "################",
        "##.##########.##",
        "###.########.###",
        "####........####",
        ".##############.",
        "..############..",
        ".##.########.##.",
        "###..######..###",
        "####........####",
      ],
      heart: [
        "..###...###..",
        ".#####.#####.",
        "##.##########",
        "#############",
        "#############",
        ".###########.",
        "..#########..",
        "...#######...",
        "....#####....",
        ".....###.....",
        "......#......",
      ],
    };
    const SPRITE_NAMES = Object.keys(SPRITES);

    let glitches = [];          // { x, y, t, seed, img, w, h, color } x/y in CSS px on the canvas
    let glitchRaf = null;
    let glitchChat = false;
    let gdpr = 1;
    let lastSprite = -1, lastColor = -1;

    // Like the trail, the canvas only has pixels while a glitch plays: sized on the first press,
    // emptied (0×0) once the last glitch is gone.
    function sizeGlitch() {
      gdpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = glitchCanvas.getBoundingClientRect();
      glitchCanvas.width = Math.round(r.width * gdpr);
      glitchCanvas.height = Math.round(r.height * gdpr);
    }
    function emptyGlitch() {
      glitchCanvas.width = 0;
      glitchCanvas.height = 0;
    }
    emptyGlitch();
    window.addEventListener("resize", () => {
      if (glitches.length) sizeGlitch();
    });

    document.addEventListener("herochatchange", (e) => {
      glitchChat = e.detail.active;
    });

    // Cheap repeatable hash, so a glitch state holds for GLITCH_STEP ms at a time
    function hash(a, b, c) {
      let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
      h = (h ^ (h >>> 13)) * 1274126177;
      return (h ^ (h >>> 16)) >>> 0;
    }
    function pickOther(n, last) {
      const i = Math.floor(Math.random() * (n - 1));
      return i >= last && last >= 0 ? i + 1 : i;
    }

    // The sprite at 1 canvas px per sprite px, scaled up later with smoothing off so it stays
    // crisp. "art": the sprite in the color over a checkerboard (halftone) shadow down and to
    // the right. "block": a block of the color with a checkered edge and the sprite cut into
    // it in black, flashed in while it glitches. All three are the same size, so slices line up.
    function bakeSprite(rows, color, mode) {
      const sw = rows[0].length, sh = rows.length;
      const w = sw + PAD * 2, h = sh + PAD * 2;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d");
      const on = (i, j) => rows[j - PAD] && rows[j - PAD][i - PAD] === "#";
      x.fillStyle = color;
      if (mode === "block") {
        x.fillRect(1, 1, w - 2, h - 2);
        for (let i = 0; i < w; i++) {
          for (let j = 0; j < h; j++) {
            if ((i === 0 || j === 0 || i === w - 1 || j === h - 1) && (i + j) % 2 === 0) x.fillRect(i, j, 1, 1);
          }
        }
        x.fillStyle = "#000";
      } else {
        for (let i = 0; i < w; i++) {
          for (let j = 0; j < h; j++) {
            if (!on(i, j) && (on(i - 1, j - 1) || on(i - 2, j - 2)) && (i + j) % 2 === 0) x.fillRect(i, j, 1, 1);
          }
        }
      }
      for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) if (on(i, j)) x.fillRect(i, j, 1, 1);
      }
      return { img: c, w, h };
    }

    function drawGlitches(now) {
      gctx.setTransform(1, 0, 0, 1, 0, 0);
      gctx.clearRect(0, 0, glitchCanvas.width, glitchCanvas.height);
      gctx.imageSmoothingEnabled = false;

      glitches = glitches.filter((g) => now - g.t < GLITCH_LIFE);
      for (const g of glitches) {
        const age = Math.max(0, now - g.t);
        const step = Math.floor(age / GLITCH_STEP);
        const rnd = (k) => hash(step, k, g.seed);
        // How torn up it is: heavy on arrival, calm with the odd spike while it holds,
        // ramping up again as it leaves
        const outT = Math.max(0, (age - (GLITCH_LIFE - GLITCH_OUT)) / GLITCH_OUT);
        let amt = age < GLITCH_IN ? 1 - age / GLITCH_IN * 0.8 : 0.08;
        if (age >= GLITCH_IN && rnd(1) % 6 === 0) amt = 0.55; // a spike
        amt = Math.max(amt, outT * 1.4);
        // Flicker: whole frames drop out on arrival and more and more on the way out
        if (age < GLITCH_IN && rnd(2) % 3 === 0) continue;
        if (outT > 0 && rnd(3) % 100 < outT * 70) continue;

        const P = g.P;                       // CSS px per sprite px
        const left = g.x - (g.w * P) / 2, top = g.y - (g.h * P) / 2;
        const scale = gdpr * P;
        const snap = (v) => Math.round(v * gdpr) / gdpr;

        // Stray bars of the color around the block, a few each state
        gctx.setTransform(gdpr, 0, 0, gdpr, 0, 0);
        gctx.fillStyle = g.color;
        const bars = Math.round(amt * 6);
        for (let b = 0; b < bars; b++) {
          const hb = rnd(10 + b);
          const bw = P * (2 + (hb % 14));
          const bh = P * (1 + ((hb >>> 4) % 2));
          const bx = left + ((((hb >>> 6) % 1000) / 1000) * 1.8 - 0.4) * g.w * P;
          const by = top + (((hb >>> 16) % 1000) / 1000) * g.h * P;
          gctx.globalAlpha = 0.5 + ((hb >>> 3) % 5) / 10;
          gctx.fillRect(snap(bx), snap(by), bw, bh);
        }
        gctx.globalAlpha = 1;

        // The block, in horizontal slices. Each slice is a few sprite rows tall and shifts
        // sideways by a random whole number of sprite px; while torn, some slices drop out.
        let row = 0, s = 0;
        while (row < g.h) {
          const hs = rnd(100 + s);
          const sliceH = Math.min(g.h - row, 1 + (hs % 4));
          const shifted = (hs >>> 3) % 100 < amt * 60;
          const dx = shifted ? ((((hs >>> 10) % 9) - 4) * amt * 3) | 0 : 0;
          const gone = outT > 0 && (hs >>> 20) % 100 < outT * 55;
          if (!gone) {
            const y = top + row * P;
            gctx.setTransform(1, 0, 0, 1, 0, 0);
            // White ghost copy behind, offset to one side, while glitching
            if (shifted && amt > 0.3) {
              gctx.globalAlpha = 0.85;
              gctx.globalCompositeOperation = "lighter";
              gctx.drawImage(g.ghost, 0, row, g.w, sliceH,
                Math.round((left + (dx + 2) * P) * gdpr), Math.round(y * gdpr), g.w * scale, sliceH * scale);
              gctx.globalCompositeOperation = "source-over";
              gctx.globalAlpha = 1;
            }
            // Torn slices sometimes flash to the solid block
            const img = shifted && amt > 0.3 && (hs >>> 25) % 3 === 0 ? g.block : g.img;
            gctx.drawImage(img, 0, row, g.w, sliceH,
              Math.round((left + dx * P) * gdpr), Math.round(y * gdpr), g.w * scale, sliceH * scale);
          }
          row += sliceH;
          s++;
        }

        // Scanlines: every other screen row of the block darkened a little
        gctx.setTransform(gdpr, 0, 0, gdpr, 0, 0);
        gctx.fillStyle = "rgba(0, 0, 0, 0.18)";
        for (let yy = 0; yy < g.h * P; yy += 3) gctx.fillRect(snap(left), snap(top + yy), g.w * P, 1);
      }
      gctx.globalAlpha = 1;

      if (glitches.length) {
        glitchRaf = requestAnimationFrame(drawGlitches);
      } else {
        glitchRaf = null;
        emptyGlitch();
      }
    }

    // Each sprite and color is baked once, on its first use, and reused after
    const bakedCache = new Map();
    function bakedFor(name, color) {
      const key = `${name}|${color}`;
      if (!bakedCache.has(key)) {
        const rows = SPRITES[name];
        bakedCache.set(key, {
          baked: bakeSprite(rows, color, "art"),
          block: bakeSprite(rows, color, "block").img,
          ghost: bakeSprite(rows, "#ffffff", "art").img,
        });
      }
      return bakedCache.get(key);
    }

    function spawnGlitch(clientX, clientY) {
      if (!glitchCanvas.width) sizeGlitch();
      const r = glitchCanvas.getBoundingClientRect();
      const si = pickOther(SPRITE_NAMES.length, lastSprite);
      const ci = pickOther(GLITCH_COLORS.length, lastColor);
      lastSprite = si;
      lastColor = ci;
      const { baked, block, ghost } = bakedFor(SPRITE_NAMES[si], GLITCH_COLORS[ci]);
      // Whole CSS px per sprite px, sized off the widest sprite so they all read about the same
      const target = r.width < 600 ? SPRITE_PX * 0.75 : SPRITE_PX;
      const P = Math.max(4, Math.round(target / 16));
      glitches.push({
        x: Math.round(clientX - r.left), y: Math.round(clientY - r.top), t: performance.now(),
        seed: (Math.random() * 1e6) | 0, img: baked.img, block, ghost, w: baked.w, h: baked.h,
        color: GLITCH_COLORS[ci], P,
      });
      if (glitchRaf === null) glitchRaf = requestAnimationFrame(drawGlitches);
    }

    // A press on the hero's empty space (not its links, buttons, the chat bar or a chat bubble)
    // glitches the moment it goes down, a finger or a mouse button alike, so swipes and scrolls
    // that start on the hero count too. Not a press that catches the light: its cue is the hero
    // wave. Pointer events rather than `click`, which iOS Safari doesn't send for taps on
    // non-interactive areas.
    glowCell.addEventListener("pointerdown", (e) => {
      if (glitchChat || !e.isPrimary || e.button !== 0) return;
      if (e.target.closest("a, button, input, .chat-glass, .chat-overlay, .floating-navbar")) return;
      if (pressCatchesLight(e.clientX, e.clientY, e.pointerType !== "mouse")) return; // the wave shows instead
      spawnGlitch(e.clientX, e.clientY);
    });
  }


  // Hero wave: catching the light (a press on its head, held or not) sends one solid swell of
  // random characters rolling out from the catch, like a surface bulging up and spreading. The
  // whole disc behind the front fills with characters; a raised crest at the front lifts them
  // toward the viewer (larger, nudged up and outward) and the surface settles behind it.
  // Characters flicker through new ones as it rolls. Colored by distance from the catch: it
  // bursts white and cream and cools into lilac, purple and violet as it spreads and fades.
  // IBM Plex Mono on a character grid. Drawn on its own full-resolution canvas, between the
  // glitch and the light, only while a wave is running. Off during a chat, and under
  // prefers-reduced-motion.
  const waveCanvas = document.querySelector(".home-ripple");
  if (waveCanvas && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const wctx = waveCanvas.getContext("2d");
    const CELL = 16;            // px between characters on the grid
    const FONT_PX = 13;
    const WAVE_SPEED = 260;     // px/s the swell travels outward
    const WAVE_LIFE = 1600;     // ms until a wave has faded out completely
    const CREST_AT = 26;        // px behind the leading edge where the crest peaks
    const CREST_WIDTH = 20;     // px, how broad the crest is (its Gaussian spread)
    const SURFACE = 0.32;       // height of the settled surface behind the crest (crest = 1)
    const SURFACE_DECAY = 160;  // px behind the front over which that surface fades out
    const LIFT_PX = 7;          // how far the crest pushes characters outward
    const RISE_PX = 9;          // how far it raises them (upward on screen, toward the viewer)
    const LIFT_SCALE = 0.6;     // how much it enlarges them (+60% at the peak)
    const CHAR_FLICKER = 70;    // ms each character holds before changing
    const CHARS = "01<>/\\{}[]()#*+=-~:;!?%&$@ABCDEFGHJKLMNPRSTUVXYZ";
    // By distance from the catch (px): white and cream at the burst, then the purples outward
    const WAVE_SHADES = [[40, "#ffffff"], [95, "#ffd9a8"], [175, "#d089ff"], [270, "#6a1fd0"], [Infinity, "#5a2fd0"]];
    const FONT = `400 ${FONT_PX}px "IBM Plex Mono", monospace`;

    let waves = [];             // { x, y, t, seed } in CSS px relative to the canvas
    let waveRaf = null;
    let waveChat = false;
    let wdpr = 1;

    // The canvas is full resolution (the characters need to be crisp), about 20MB on a
    // 1440x900 retina hero, so it only has pixels while a wave is playing: sized on a catch,
    // emptied (0x0) once the last wave fades.
    function sizeWave() {
      wdpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = waveCanvas.getBoundingClientRect();
      waveCanvas.width = Math.round(r.width * wdpr);
      waveCanvas.height = Math.round(r.height * wdpr);
    }
    function emptyWave() {
      waveCanvas.width = 0;
      waveCanvas.height = 0;
    }
    emptyWave();
    window.addEventListener("resize", () => {
      if (waves.length) sizeWave();
    });
    if (document.fonts && document.fonts.load) document.fonts.load(FONT); // ready before the first catch

    document.addEventListener("herochatchange", (e) => {
      waveChat = e.detail.active;
    });

    // Cheap repeatable hash, so a cell keeps its character for CHAR_FLICKER ms at a time
    function hash(a, b, c) {
      let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
      h = (h ^ (h >>> 13)) * 1274126177;
      return (h ^ (h >>> 16)) >>> 0;
    }
    function shadeAt(d) {
      for (const [upTo, color] of WAVE_SHADES) if (d < upTo) return color;
      return WAVE_SHADES[WAVE_SHADES.length - 1][1];
    }

    function drawWaves(now) {
      wctx.setTransform(1, 0, 0, 1, 0, 0);
      wctx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
      wctx.font = FONT;
      wctx.textAlign = "center";
      wctx.textBaseline = "middle";

      waves = waves.filter((w) => now - w.t < WAVE_LIFE);
      for (const w of waves) {
        const age = Math.max(0, now - w.t);
        const front = (age / 1000) * WAVE_SPEED; // the leading edge's radius
        const fade = Math.pow(1 - age / WAVE_LIFE, 1.3);
        const reach = front + LIFT_PX;
        const c0 = Math.floor((w.x - reach) / CELL), c1 = Math.ceil((w.x + reach) / CELL);
        const r0 = Math.floor((w.y - reach) / CELL), r1 = Math.ceil((w.y + reach) / CELL);
        const tick = Math.floor(now / CHAR_FLICKER);
        for (let row = r0; row <= r1; row++) {
          for (let col = c0; col <= c1; col++) {
            const cx = col * CELL + CELL / 2;
            const cy = row * CELL + CELL / 2;
            const dx = cx - w.x, dy = cy - w.y;
            const d = Math.hypot(dx, dy);
            const behind = front - d; // 0 at the leading edge, growing toward the center
            if (behind <= 0) continue;
            // Height of the surface here: the crest (a Gaussian bump just behind the leading
            // edge, eased in at the edge) over a lower settled surface that fades behind it
            const crest = Math.exp(-Math.pow((behind - CREST_AT) / CREST_WIDTH, 2));
            const surface = SURFACE * Math.exp(-behind / SURFACE_DECAY) * Math.min(1, behind / CREST_AT);
            const lift = Math.max(crest, surface) * Math.min(1, behind / 8);
            if (lift < 0.05) continue;
            const alpha = Math.min(1, 0.25 + lift) * fade;
            if (alpha < 0.03) continue; // too faint to show
            const h = hash(col, row, tick + w.seed);
            if (h % 7 === 0) continue; // a few gaps keep the surface from reading as a solid block
            const push = d > 0 ? (lift * LIFT_PX) / d : 0;
            // Sizes are rounded to 5 steps and positions to device pixels, so the browser can
            // reuse rendered glyphs instead of rasterizing every character at a new size each
            // frame (which dropped frames)
            const size = 1 + (Math.round(lift * 4) / 4) * LIFT_SCALE;
            wctx.setTransform(wdpr * size, 0, 0, wdpr * size,
              Math.round(wdpr * (cx + dx * push)), Math.round(wdpr * (cy + dy * push - lift * RISE_PX)));
            wctx.globalAlpha = alpha;
            wctx.fillStyle = shadeAt(d);
            wctx.fillText(CHARS[(h >>> 7) % CHARS.length], 0, 0);
          }
        }
      }
      wctx.globalAlpha = 1;

      if (waves.length) {
        waveRaf = requestAnimationFrame(drawWaves);
      } else {
        waveRaf = null;
        emptyWave();
      }
    }

    document.addEventListener("herocatch", (e) => {
      if (waveChat) return;
      if (!waveCanvas.width) sizeWave();
      const r = waveCanvas.getBoundingClientRect();
      waves.push({ x: e.detail.x - r.left, y: e.detail.y - r.top, t: performance.now(), seed: (Math.random() * 1e6) | 0 });
      if (waveRaf === null) waveRaf = requestAnimationFrame(drawWaves);
    });
  }


});
