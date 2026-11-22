"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const canvas = document.createElement("canvas");
    if (!canvas.getContext("webgl2")) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      return;
    }

    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    const fallback = mount.querySelector<HTMLElement>("[data-orbit-fallback]");
    if (fallback) fallback.hidden = true;

    // 3D Glass Structural Geometry (Icosahedron)
    const geometry = new THREE.IcosahedronGeometry(1.8, 1);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xe0b0ff,
      metalness: 0.1,
      roughness: 0.2,
      transmission: 0.9,
      thickness: 1.2,
      wireframe: false,
      transparent: true,
      opacity: 0.75,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Wireframe Overlay
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);
    scene.add(wireframeMesh);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xe0b0ff, 3, 100);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x80d8ff, 3, 100);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    // Particles Constellation
    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 15;
    }
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xe0b0ff,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Mouse Parallax Interaction
    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener("mousemove", onMouseMove);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      mesh.rotation.x += 0.005;
      mesh.rotation.y += 0.008;
      wireframeMesh.rotation.x += 0.005;
      wireframeMesh.rotation.y += 0.008;
      particles.rotation.y += 0.001;

      // Smooth Mouse Parallax Rotation
      mesh.rotation.y += (mouseX * 0.5 - mesh.rotation.y) * 0.05;
      mesh.rotation.x += (mouseY * 0.5 - mesh.rotation.x) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div ref={mountRef} className="w-full h-[380px] md:h-[480px] relative">
      <div
        data-orbit-fallback
        aria-hidden="true"
        className="absolute inset-0 grid place-items-center overflow-hidden"
      >
        <div className="relative h-56 w-56 rounded-full border border-white/20 bg-gradient-to-br from-fuchsia-300/30 via-violet-400/10 to-cyan-200/20 shadow-[0_0_90px_rgba(167,139,250,0.28)] md:h-72 md:w-72">
          <div className="absolute inset-5 rounded-full border border-white/20" />
          <div className="absolute inset-12 rounded-full border border-dashed border-cyan-100/30" />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_24px_rgba(255,255,255,0.9)]" />
        </div>
      </div>
    </div>
  );
}
