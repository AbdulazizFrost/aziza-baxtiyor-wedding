window.addEventListener("load", () => {
    const bgMusic = document.getElementById("bgMusic");

    // Master GSAP Timeline (must start paused so intro can play first)
    const masterTl = gsap.timeline({ paused: true });
    let isAudioPlaying = false;
    let experienceStarted = false;

    // Build the GSAP timeline
    const scenes = gsap.utils.toArray(".scene");
    gsap.set(scenes, { autoAlpha: 0 });

    scenes.forEach((scene, index) => {
        const bg = scene.querySelector(".bg-wrapper");
        const ornaments = scene.querySelectorAll(".ornament");
        const textElements = scene.querySelectorAll(".content > *:not(.ornament):not(.footer-links)");
        const footer = scene.querySelector(".footer-links");
        const heart = scene.querySelector(".heart-icon");
        const heartPath = scene.querySelector(".heart-icon path");

        const sceneTl = gsap.timeline();

        // 1. Fade in the scene container
        sceneTl.to(scene, { autoAlpha: 1, duration: 0.8, ease: "power2.inOut" });

        // 2. Cinematic slow zoom on background image
        if (bg) {
            sceneTl.fromTo(bg, 
                { scale: 1.05, filter: "blur(2px)" }, 
                { scale: 1, filter: "blur(0px)", duration: 3.0, ease: "power1.out" }, 
                "<"
            );
        }

        // Synchronization checkpoint removed. Animation will play continuously.

        // 3. Elegant staggered fade-up for ornaments
        if (ornaments.length > 0) {
            sceneTl.fromTo(ornaments, 
                { autoAlpha: 0, y: (i, el) => el.classList.contains('top-left') || el.classList.contains('top-right') ? -15 : 15 }, 
                { autoAlpha: 0.85, y: 0, duration: 1.0, stagger: 0.1, ease: "power2.out" }, 
                "-=2.0"
            );
        }

        // 4. Staggered fade-up for text/dividers
        if (textElements.length > 0) {
            sceneTl.fromTo(textElements, 
                { autoAlpha: 0, y: 15 }, 
                { autoAlpha: 1, y: 0, duration: 1.0, stagger: 0.15, ease: "power2.out" }, 
                "-=2.0"
            );
        }
        
        // Custom micro-animation for Scene 3 (Heart Drawing)
        if (heart && heartPath) {
            sceneTl.to(heart, { autoAlpha: 1, duration: 0.4 }, "-=1.5");
            const pathLength = heartPath.getTotalLength();
            gsap.set(heartPath, { strokeDasharray: pathLength, strokeDashoffset: pathLength });
            sceneTl.to(heartPath, { strokeDashoffset: 0, duration: 1.0, ease: "power2.inOut" }, "-=1.5");
        }

        // 5. Fade in footer links last
        if (footer) {
            sceneTl.fromTo(footer, 
                { autoAlpha: 0 }, 
                { autoAlpha: 1, duration: 1.0, ease: "power2.out" }, 
                "-=1.5"
            );
        }

        // 6. Hold the scene for reading time
        sceneTl.to({}, { duration: 2.0 }); 

        // 7. Fade out the entire scene (UNLESS it is the very last scene)
        if (index < scenes.length - 1) {
            sceneTl.to(scene, { autoAlpha: 0, duration: 0.8, ease: "power2.inOut" });
        }

        // Add to master timeline
        masterTl.add(sceneTl);
    });

    // --- INTRO SCREEN ANIMATION ---
    const introTl = gsap.timeline();
    introTl.from(".intro-bg-img", { scale: 1.1, filter: "blur(4px)", duration: 2, ease: "power2.out" })
           .from(".intro-names h1, .intro-names .ampersand", { autoAlpha: 0, y: 15, stagger: 0.1, duration: 1.5, ease: "power2.out" }, "-=1.5")
           .from(".intro-date", { autoAlpha: 0, y: 10, duration: 1.2, ease: "power2.out" }, "-=1.0");

    // --- DETERMINISTIC AUDIO SYSTEM ---
    const openBtn = document.getElementById("open-invitation-btn");
    if (openBtn) {
        openBtn.addEventListener("click", () => {
            if (experienceStarted) return;
            experienceStarted = true;

            // 1. Play audio immediately inside user gesture handler (Safari requirement)
            bgMusic.currentTime = 0;
            const playPromise = bgMusic.play();
            if (playPromise !== undefined) {
                playPromise.catch(err => {
                    // We catch NotAllowedError (or any other) gracefully without breaking the site
                    console.log("Audio playback error:", err);
                });
            }
            isAudioPlaying = true;

            // 2. Start main cinematic animation synchronously
            masterTl.play();

            // 3. Fade out intro screen elegantly
            gsap.to("#intro-screen", {
                autoAlpha: 0,
                duration: 1.2,
                ease: "power2.inOut",
                onComplete: () => {
                    document.getElementById("intro-screen").style.display = "none";
                }
            });
        });
    }

    // --- PAGE LIFECYCLE MANAGEMENT ---
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            // Pause everything when tab is minimized/hidden
            if (isAudioPlaying) bgMusic.pause();
            masterTl.pause();
        } else {
            // Resume perfectly in sync when tab is active again
            if (isAudioPlaying) {
                bgMusic.play().catch(e => console.error("Visibility resume failed:", e));
                masterTl.play();
            }
        }
    });
});