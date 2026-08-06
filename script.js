window.addEventListener("load", () => {
    const bgMusic = document.getElementById("bgMusic");

    // Master GSAP Timeline (starts immediately)
    const masterTl = gsap.timeline();
    let isAudioPlaying = false;
    let audioBlockedAndWaiting = false;

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
        sceneTl.to(scene, { autoAlpha: 1, duration: 1, ease: "power2.inOut" });

        // 2. Cinematic slow zoom on background image
        if (bg) {
            sceneTl.fromTo(bg, 
                { scale: 1.05, filter: "blur(2px)" }, 
                { scale: 1, filter: "blur(0px)", duration: 4, ease: "power1.out" }, 
                "<"
            );
        }

        // --- SYNCHRONIZATION CHECKPOINT FOR SCENE 1 ---
        // If this is the first scene, we pause the master timeline here if audio is blocked.
        // This ensures the site looks alive (ambient zoom/fade happened) but does not advance to Scene 2.
        if (index === 0) {
            sceneTl.add(() => {
                if (!isAudioPlaying) {
                    masterTl.pause();
                    audioBlockedAndWaiting = true;
                }
            }, 3.5); // Pause at 3.5s if no audio
        }

        // 3. Elegant staggered fade-up for ornaments
        if (ornaments.length > 0) {
            sceneTl.fromTo(ornaments, 
                { autoAlpha: 0, y: (i, el) => el.classList.contains('top-left') || el.classList.contains('top-right') ? -20 : 20 }, 
                { autoAlpha: 0.85, y: 0, duration: 1.5, stagger: 0.2, ease: "power2.out" }, 
                "-=3.5"
            );
        }

        // 4. Staggered fade-up for text/dividers
        if (textElements.length > 0) {
            sceneTl.fromTo(textElements, 
                { autoAlpha: 0, y: 15 }, 
                { autoAlpha: 1, y: 0, duration: 1.5, stagger: 0.3, ease: "power2.out" }, 
                "-=3"
            );
        }
        
        // Custom micro-animation for Scene 3 (Heart Drawing)
        if (heart && heartPath) {
            sceneTl.to(heart, { autoAlpha: 1, duration: 0.5 }, "-=1.5");
            const pathLength = heartPath.getTotalLength();
            gsap.set(heartPath, { strokeDasharray: pathLength, strokeDashoffset: pathLength });
            sceneTl.to(heartPath, { strokeDashoffset: 0, duration: 1.5, ease: "power2.inOut" }, "-=1.5");
        }

        // 5. Fade in footer links last
        if (footer) {
            sceneTl.fromTo(footer, 
                { autoAlpha: 0 }, 
                { autoAlpha: 1, duration: 1.5, ease: "power2.out" }, 
                "-=1.5"
            );
        }

        // 6. Hold the scene for reading time
        sceneTl.to({}, { duration: 4 }); 

        // 7. Fade out the entire scene (UNLESS it is the very last scene)
        if (index < scenes.length - 1) {
            sceneTl.to(scene, { autoAlpha: 0, duration: 1.2, ease: "power2.inOut" });
        }

        // Add to master timeline
        masterTl.add(sceneTl);
    });

    // --- DETERMINISTIC AUDIO SYSTEM ---
    const startExperience = () => {
        if (isAudioPlaying) return; 
        
        const playPromise = bgMusic.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                // Success: Audio is playing
                isAudioPlaying = true;
                
                // Remove fallback listeners immediately to prevent race conditions
                ['click', 'touchstart', 'keydown'].forEach(evt => 
                    document.removeEventListener(evt, handleInteraction)
                );
                
                // If the timeline was paused waiting for interaction, resume it!
                if (audioBlockedAndWaiting) {
                    audioBlockedAndWaiting = false;
                    masterTl.play();
                }
            }).catch(error => {
                // Autoplay blocked by browser. We wait for user interaction via fallback listeners.
                console.log("Autoplay blocked. Waiting for user interaction...");
            });
        }
    };

    const handleInteraction = () => {
        if (isAudioPlaying) return;
        
        // 1. Remove listeners immediately to avoid duplicate triggering on rapid taps
        ['click', 'touchstart', 'keydown'].forEach(evt => 
            document.removeEventListener(evt, handleInteraction)
        );
        
        // 2. Synchronize audio perfectly to the GSAP timeline current time
        // This prevents the music from feeling "late" if they tap after initial ambient animations
        if (masterTl.time() > 0 && bgMusic.duration > 0) {
            bgMusic.currentTime = masterTl.time() % bgMusic.duration;
        }
        
        // 3. Start audio (and implicitly resume the timeline via the promise resolution)
        startExperience();
    };

    // Setup fallback interaction listeners
    ['click', 'touchstart', 'keydown'].forEach(evt => 
        document.addEventListener(evt, handleInteraction, { once: true })
    );

    // Initial attempt to autoplay (will succeed silently on desktop, usually fail on mobile)
    startExperience();

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
                // Only resume timeline if we aren't deliberately waiting for a block
                if (!audioBlockedAndWaiting) {
                    masterTl.play();
                }
            }
        }
    });
});