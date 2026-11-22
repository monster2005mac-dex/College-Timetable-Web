"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const fallback = mount.querySelector<HTMLElement>("[data-orbit-fallback]");
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.15, 7.2);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.className = "three-scene-canvas";
    if (fallback) fallback.hidden = true;

    const group = new THREE.Group();
    scene.add(group);

    const coreGeometry = new THREE.IcosahedronGeometry(1.22, 2);
    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x9bdc9a,
      metalness: 0.34,
      roughness: 0.2,
      transmission: 0.48,
      thickness: 1.4,
      transparent: true,
      opacity: 0.88,
      clearcoat: 0.9,
      clearcoatRoughness: 0.14,
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);

    const wireMaterial = new THREE.MeshBasicMaterial({ color: 0xd8f4ca, wireframe: true, transparent: true, opacity: 0.19 });
    const wireframe = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), wireMaterial);
    group.add(wireframe);

    const orbitMaterial = new THREE.MeshStandardMaterial({ color: 0xaeea84, metalness: 0.65, roughness: 0.24 });
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.018, 12, 160), orbitMaterial);
    orbit.rotation.set(1.08, 0.1, -0.3);
    group.add(orbit);
    const orbitTwo = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.009, 8, 160), new THREE.MeshBasicMaterial({ color: 0x86d9ff, transparent: true, opacity: 0.44 }));
    orbitTwo.rotation.set(0.65, -0.75, 0.54);
    group.add(orbitTwo);

    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 20), new THREE.MeshBasicMaterial({ color: 0xf2f9d8 }));
    bead.position.set(0.5, 1.74, 0.2);
    group.add(bead);

    scene.add(new THREE.AmbientLight(0xe7f6e4, 1.1));
    const keyLight = new THREE.PointLight(0xb7f479, 18, 18);
    keyLight.position.set(4, 3, 5);
    scene.add(keyLight);
    const coolLight = new THREE.PointLight(0x90dbff, 12, 16);
    coolLight.position.set(-4, -2, 3);
    scene.add(coolLight);

    const particleCount = 120;
    const positions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const radius = 2.3 + Math.random() * 2.4;
      const angle = Math.random() * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 4.4;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0xc8edaa, size: 0.022, transparent: true, opacity: 0.72 }));
    scene.add(particles);

    let pointerX = 0;
    let pointerY = 0;
    let frameId = 0;
    let width = 1;
    let height = 1;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onPointerMove = (event: PointerEvent) => {
      const bounds = mount.getBoundingClientRect();
      pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.4;
      pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.3;
    };
    const resizeObserver = new ResizeObserver(([entry]) => {
      width = Math.max(1, entry.contentRect.width);
      height = Math.max(1, entry.contentRect.height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      if (reducedMotion.matches) renderer.render(scene, camera);
    });
    resizeObserver.observe(mount);
    mount.addEventListener("pointermove", onPointerMove);

    let elapsed = 0;
    let previous = 0;
    const animate = (time: number) => {
      frameId = requestAnimationFrame(animate);
      const delta = Math.min((time - previous) / 1000, 0.05);
      previous = time;
      if (!reducedMotion.matches) elapsed += delta;
      group.rotation.y += (pointerX + elapsed * 0.13 - group.rotation.y) * 0.035;
      group.rotation.x += (pointerY + Math.sin(elapsed * 0.35) * 0.045 - group.rotation.x) * 0.035;
      particles.rotation.y = elapsed * 0.025;
      renderer.render(scene, camera);
    };
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      mount.removeEventListener("pointermove", onPointerMove);
      coreGeometry.dispose();
      coreMaterial.dispose();
      wireframe.geometry.dispose();
      wireMaterial.dispose();
      orbit.geometry.dispose();
      orbitMaterial.dispose();
      orbitTwo.geometry.dispose();
      (orbitTwo.material as THREE.Material).dispose();
      bead.geometry.dispose();
      (bead.material as THREE.Material).dispose();
      particleGeometry.dispose();
      (particles.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
      if (fallback) fallback.hidden = false;
    };
  }, []);

  return (
    <div ref={mountRef} className="three-scene" aria-hidden="true">
      <div data-orbit-fallback className="orbit-fallback">
        <div className="orbit-fallback-ring" />
        <div className="orbit-fallback-ring orbit-fallback-ring-two" />
        <div className="orbit-fallback-ring orbit-fallback-ring-three" />
        <div className="orbit-fallback-core" />
      </div>
    </div>
  );
}
