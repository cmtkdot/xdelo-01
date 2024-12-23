import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeDVisualizationProps {
  data?: any[];
}

export const ThreeDVisualization = ({ data }: ThreeDVisualizationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0x6366f1, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Create data visualization
    const bars: THREE.Mesh[] = [];
    const numericKeys = Object.keys(data[0]).filter(key => typeof data[0][key] === 'number');
    
    numericKeys.forEach((key, index) => {
      const maxValue = Math.max(...data.map(item => item[key]));
      data.forEach((item, dataIndex) => {
        const height = (item[key] / maxValue) * 2;
        const geometry = new THREE.BoxGeometry(0.5, height, 0.5);
        const material = new THREE.MeshPhongMaterial({ 
          color: new THREE.Color(`hsl(${index * 40 + 200}, 70%, 50%)`),
          transparent: true,
          opacity: 0.8
        });
        const bar = new THREE.Mesh(geometry, material);
        
        // Position bars in a grid
        const spacing = 1;
        bar.position.x = (dataIndex - data.length / 2) * spacing;
        bar.position.y = height / 2;
        bar.position.z = (index - numericKeys.length / 2) * spacing;
        
        scene.add(bar);
        bars.push(bar);
      });
    });

    // Position camera
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    // Add rotation animation
    let rotation = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      rotation += 0.005;
      
      bars.forEach(bar => {
        bar.rotation.y = rotation;
      });
      
      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement);
      scene.clear();
      renderer.dispose();
    };
  }, [data]);

  return <div ref={containerRef} className="w-full h-64 glass-card" />;
};