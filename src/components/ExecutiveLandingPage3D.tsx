import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  X,
} from 'lucide-react';
import { toSimplifiedChinese, useLanguage } from '../domain/i18n';
import { AppLanguage, CurrencyCode } from '../domain/types';
import {
  computeLandingActuarialSandbox,
  LANDING_SANDBOX_MANDATES,
  LANDING_TEMPLATES_CATALOG,
  LANDING_TEMPLATE_STORAGE_KEY,
  LandingTemplateId,
  resolveInitialLandingTemplate,
  SandboxMandateOption,
} from '../domain/landingTemplatesConfig';
import {
  Template01DaylightStudio,
  Template02ArchivalBroadsheet,
  Template03SwissInternational,
  Template04FamilyOfficeCinema,
} from './LandingFourDistinctTemplates';
import { CantoneseTutorialShowcase } from './CantoneseTutorialShowcase';
import { WorkspaceSection } from './SidebarNav';

import type { User } from 'firebase/auth';
import type { MemberAccountProfile } from '../domain/memberAuthEngine';
import type { TutorialTargetSubTab } from '../domain/tutorialWalkthroughConfig';
import type { MemberModalInitialTab } from './MemberAuthModal';

export type HorologySculptureMode = 'EQUILIBRIUM' | 'EXPLODED' | 'TOPOGRAPHY';

interface ExecutiveLandingPage3DProps {
  plansCount: number;
  insurersCount: number;
  leadsCount: number;
  inForceCount: number;
  activeMember?: MemberAccountProfile | null;
  onOpenMemberAuth?: (tab?: MemberModalInitialTab) => void;
  googleUser?: User | null;
  cloudBackupBusy?: boolean;
  onGoogleAuthAndBackup?: (params: {
    user: User;
    accessToken: string;
  }) => Promise<void> | void;
  onGoogleAuthError?: (message: string) => void;
  onEnterWorkbench: (
    targetStage?: WorkspaceSection,
    targetSubTab?: TutorialTargetSubTab,
    targetLeadId?: string,
    guidedChapterId?: string
  ) => void;
}

const SCULPTURE_CAMERA_TARGETS: Record<
  HorologySculptureMode,
  {
    pos: [number, number, number];
    look: [number, number, number];
    explodeFactor: number;
  }
> = {
  EQUILIBRIUM: {
    pos: [0.18, 0.85, 8.45],
    look: [0, -0.06, 0],
    explodeFactor: 0,
  },
  EXPLODED: {
    pos: [2.25, 1.4, 8.55],
    look: [0, 0.02, 0],
    explodeFactor: 1,
  },
  TOPOGRAPHY: {
    pos: [0.2, 5.15, 5.85],
    look: [0, -0.55, 0],
    explodeFactor: 0.28,
  },
};

const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _dummyMatrixObj = new THREE.Object3D();
const _instanceColor = new THREE.Color();

function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createBrushedMetalTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#d9bc72';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 2) {
      const alpha = ((y * 17) % 9) * 0.012;
      ctx.fillStyle = y % 4 === 0 ? `rgba(255,248,224,${alpha})` : `rgba(82,58,14,${alpha})`;
      ctx.fillRect(0, y, 256, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createSoftGlowShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 6, 128, 128, 122);
    grad.addColorStop(0, 'rgba(223, 189, 105, 0.24)');
    grad.addColorStop(0.45, 'rgba(30, 64, 120, 0.12)');
    grad.addColorStop(1, 'rgba(5, 8, 16, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ============================================================================
// TEMPLATE 05: SPATIAL 3D HOROLOGICAL LAB (Three.js 12-Part Astrolabe + Wave)
// ============================================================================
const Template05SpatialHorology3D: React.FC<ExecutiveLandingPage3DProps> = ({
  plansCount,
  insurersCount,
  leadsCount,
  inForceCount,
  activeMember = null,
  onOpenMemberAuth,
  onEnterWorkbench,
}) => {
  const { lang, setLang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const [sculptureMode, setSculptureMode] =
    useState<HorologySculptureMode>('EQUILIBRIUM');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [webglUnavailable, setWebglUnavailable] = useState<boolean>(false);

  const [selectedMandateId, setSelectedMandateId] =
    useState<SandboxMandateOption['leadId']>('lead-henry-wang');
  const [sandboxCurrency, setSandboxCurrency] = useState<CurrencyCode>('USD');
  const [dividendStressPct, setDividendStressPct] = useState<100 | 90 | 85>(100);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sculptureModeRef = useRef<HorologySculptureMode>('EQUILIBRIUM');
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    sculptureModeRef.current = sculptureMode;
  }, [sculptureMode]);

  const activeMandate = useMemo(
    () =>
      LANDING_SANDBOX_MANDATES.find((m) => m.leadId === selectedMandateId) ||
      LANDING_SANDBOX_MANDATES[0],
    [selectedMandateId]
  );

  const sandboxProjection = useMemo(
    () =>
      computeLandingActuarialSandbox(
        activeMandate,
        sandboxCurrency,
        dividendStressPct
      ),
    [activeMandate, sandboxCurrency, dividendStressPct]
  );

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const isSoftwareGl = detectSoftwareWebGL();
    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(item: T): T => {
      disposables.push(item);
      return item;
    };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    const width = Math.max(320, mountEl.clientWidth || 720);
    const height = Math.max(360, mountEl.clientHeight || 580);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglUnavailable(true);
    };
    const onContextRestored = () => {
      setWebglUnavailable(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050810);
    scene.fog = new THREE.FogExp2(0x050810, 0.042);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 60);
    camera.position.set(0.18, 0.85, 8.45);
    const currentLookAt = new THREE.Vector3(0, -0.06, 0);
    camera.lookAt(currentLookAt);

    if (!isSoftwareGl) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envTarget.texture;
      disposables.push(envTarget);
      pmremGenerator.dispose();
    }

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x091326, 1.55);
    hemiLight.position.set(0, 18, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d0, 3.2);
    keyLight.position.set(6.5, 9.5, 7.5);
    scene.add(keyLight);

    const sapphireRimLight = new THREE.PointLight(0x60a5fa, 2.8, 24, 1.6);
    sapphireRimLight.position.set(-6.2, 3.8, -4.5);
    scene.add(sapphireRimLight);

    const goldCoreLight = new THREE.PointLight(0xfbe29d, 2.6, 14, 1.5);
    goldCoreLight.position.set(1.2, 1.4, 3.4);
    scene.add(goldCoreLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const brushedGoldTex = track(createBrushedMetalTexture(maxAniso));
    const glowDiscTex = track(createSoftGlowShadowTexture());

    const champagneGoldMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xf1d28a,
        map: brushedGoldTex,
        emissive: 0x8a6418,
        emissiveIntensity: 0.42,
        roughness: 0.22,
        metalness: 0.45,
      })
    );

    const satinPlatinumMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        emissive: 0x1e293b,
        emissiveIntensity: 0.35,
        roughness: 0.48,
        metalness: 0.38,
      })
    );

    const anodizedSapphireMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x1e3a6e,
        emissive: 0x0f254a,
        emissiveIntensity: 0.55,
        roughness: 0.2,
        metalness: 0.32,
      })
    );

    const sovereignJewelMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x6ee7b7,
        emissive: 0x0d9488,
        emissiveIntensity: 0.68,
        roughness: 0.14,
        metalness: 0.28,
      })
    );

    const luminousGoldNodeMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        emissive: 0xdfbd69,
        emissiveIntensity: 1.15,
        roughness: 0.25,
        metalness: 0.22,
      })
    );

    const fineGoldWireMat = track(
      new THREE.LineBasicMaterial({
        color: 0xe8c97a,
        transparent: true,
        opacity: 0.75,
      })
    );

    const waveContourMat = track(
      new THREE.LineBasicMaterial({
        color: 0xc9a54e,
        transparent: true,
        opacity: 0.34,
      })
    );

    const astrolabeRoot = new THREE.Group();
    astrolabeRoot.position.set(0, 0.06, 0);
    scene.add(astrolabeRoot);

    const outerAzimuthGroup = new THREE.Group();
    const outerRingMesh = new THREE.Mesh(
      track(new THREE.TorusGeometry(2.28, 0.042, 24, 128)),
      champagneGoldMat
    );
    const outerFlangeMesh = new THREE.Mesh(
      track(new THREE.TorusGeometry(2.14, 0.016, 16, 112)),
      satinPlatinumMat
    );
    outerAzimuthGroup.add(outerRingMesh, outerFlangeMesh);

    const tickCount = 72;
    const unitTickGeo = track(new THREE.BoxGeometry(0.018, 0.11, 0.018));
    const instancedTicks = new THREE.InstancedMesh(
      unitTickGeo,
      champagneGoldMat,
      tickCount
    );
    for (let i = 0; i < tickCount; i++) {
      const angle = (i / tickCount) * Math.PI * 2;
      const isMajor = i % 6 === 0;
      const r = isMajor ? 2.19 : 2.21;
      _dummyMatrixObj.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
      _dummyMatrixObj.rotation.set(0, 0, angle + Math.PI / 2);
      _dummyMatrixObj.scale.set(isMajor ? 1.45 : 0.8, isMajor ? 1.55 : 0.72, 1);
      _dummyMatrixObj.updateMatrix();
      instancedTicks.setMatrixAt(i, _dummyMatrixObj.matrix);

      _instanceColor.setHex(isMajor ? 0xfff0c2 : 0x94a3b8);
      instancedTicks.setColorAt(i, _instanceColor);
    }
    instancedTicks.instanceMatrix.needsUpdate = true;
    if (instancedTicks.instanceColor) instancedTicks.instanceColor.needsUpdate = true;
    instancedTicks.computeBoundingSphere();
    outerAzimuthGroup.add(instancedTicks);

    const finialProfile = [
      new THREE.Vector2(0.0, 0),
      new THREE.Vector2(0.065, 0.03),
      new THREE.Vector2(0.04, 0.14),
      new THREE.Vector2(0.075, 0.2),
      new THREE.Vector2(0.0, 0.28),
    ];
    const finialGeo = track(new THREE.LatheGeometry(finialProfile, 16));
    for (let c = 0; c < 4; c++) {
      const a = (c * Math.PI) / 2;
      const finial = new THREE.Mesh(finialGeo, champagneGoldMat);
      finial.position.set(Math.cos(a) * 2.32, Math.sin(a) * 2.32, 0);
      finial.rotation.z = a - Math.PI / 2;
      outerAzimuthGroup.add(finial);
    }
    outerAzimuthGroup.rotation.x = 0.24;
    outerAzimuthGroup.rotation.y = -0.28;
    astrolabeRoot.add(outerAzimuthGroup);

    const currencyGimbalGroup = new THREE.Group();
    const gimbalRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(1.78, 0.032, 20, 108)),
      satinPlatinumMat
    );
    const gimbalSapphireLiner = new THREE.Mesh(
      track(new THREE.TorusGeometry(1.69, 0.018, 16, 96)),
      anodizedSapphireMat
    );
    currencyGimbalGroup.add(gimbalRing, gimbalSapphireLiner);

    const fxSphereGeo = track(new THREE.SphereGeometry(0.078, 20, 20));
    const fxCollarGeo = track(new THREE.TorusGeometry(0.115, 0.012, 12, 32));
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI * 2) / 3;
      const fxNode = new THREE.Mesh(fxSphereGeo, luminousGoldNodeMat);
      fxNode.position.set(Math.cos(a) * 1.78, Math.sin(a) * 1.78, 0);
      const fxCollar = new THREE.Mesh(fxCollarGeo, champagneGoldMat);
      fxCollar.position.copy(fxNode.position);
      currencyGimbalGroup.add(fxNode, fxCollar);
    }
    astrolabeRoot.add(currencyGimbalGroup);

    const calibrationGroup = new THREE.Group();
    const calRingMain = new THREE.Mesh(
      track(new THREE.TorusGeometry(1.34, 0.028, 20, 96)),
      champagneGoldMat
    );
    const calRingOrthogonal = new THREE.Mesh(
      track(new THREE.TorusGeometry(1.31, 0.014, 16, 96)),
      satinPlatinumMat
    );
    calRingOrthogonal.rotation.y = Math.PI / 2;
    calibrationGroup.add(calRingMain, calRingOrthogonal);
    astrolabeRoot.add(calibrationGroup);

    const coreAssembly = new THREE.Group();
    const cageGeo = track(new THREE.IcosahedronGeometry(0.74, 0));
    const goldCageEdges = new THREE.LineSegments(
      track(new THREE.EdgesGeometry(cageGeo, 1)),
      fineGoldWireMat
    );
    const jewelOcta = new THREE.Mesh(
      track(new THREE.OctahedronGeometry(0.48, 0)),
      sovereignJewelMat
    );
    const innerHeart = new THREE.Mesh(
      track(new THREE.IcosahedronGeometry(0.22, 1)),
      luminousGoldNodeMat
    );
    coreAssembly.add(goldCageEdges, jewelOcta, innerHeart);
    astrolabeRoot.add(coreAssembly);

    const satellitesGroup = new THREE.Group();
    const satGeo = track(new THREE.SphereGeometry(0.055, 16, 16));
    const satOrbitTrack = new THREE.Mesh(
      track(new THREE.TorusGeometry(2.68, 0.008, 10, 120)),
      champagneGoldMat
    );
    satOrbitTrack.rotation.x = Math.PI / 2.35;
    satellitesGroup.add(satOrbitTrack);

    for (let s = 0; s < 6; s++) {
      const theta = (s / 6) * Math.PI * 2;
      const sat = new THREE.Mesh(
        satGeo,
        s % 2 === 0 ? luminousGoldNodeMat : sovereignJewelMat
      );
      sat.position.set(
        Math.cos(theta) * 2.68,
        Math.sin(theta) * 2.68 * Math.cos(Math.PI / 2.35),
        Math.sin(theta) * 2.68 * Math.sin(Math.PI / 2.35)
      );
      satellitesGroup.add(sat);
    }
    astrolabeRoot.add(satellitesGroup);

    const cols = 46;
    const rows = 28;
    const spanX = 13.5;
    const spanZ = 8.4;
    const segPositions: number[] = [];
    const baseGridCoords: Array<{ x: number; z: number }> = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c / (cols - 1) - 0.5) * spanX;
        const z = (r / (rows - 1) - 0.5) * spanZ;
        baseGridCoords.push({ x, z });
      }
    }

    const indexPairs: number[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (c < cols - 1) indexPairs.push(idx, idx + 1);
        if (r < rows - 1 && c % 2 === 0) indexPairs.push(idx, idx + cols);
      }
    }

    for (let i = 0; i < indexPairs.length; i++) {
      const pt = baseGridCoords[indexPairs[i]];
      segPositions.push(pt.x, 0, pt.z);
    }

    const waveGeo = track(new THREE.BufferGeometry());
    const wavePosAttr = new THREE.Float32BufferAttribute(segPositions, 3);
    wavePosAttr.setUsage(THREE.DynamicDrawUsage);
    waveGeo.setAttribute('position', wavePosAttr);

    const topographicWaveLines = new THREE.LineSegments(waveGeo, waveContourMat);
    topographicWaveLines.position.set(0, -1.95, -0.6);
    scene.add(topographicWaveLines);

    const reflectionDisc = new THREE.Mesh(
      track(new THREE.CircleGeometry(3.8, 48)),
      track(
        new THREE.MeshBasicMaterial({
          map: glowDiscTex,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
        })
      )
    );
    reflectionDisc.rotation.x = -Math.PI / 2;
    reflectionDisc.position.set(0, -1.92, 0);
    scene.add(reflectionDisc);

    const moteCount = 56;
    const moteGeo = track(new THREE.OctahedronGeometry(0.028, 0));
    const instancedMotes = new THREE.InstancedMesh(
      moteGeo,
      luminousGoldNodeMat,
      moteCount
    );
    instancedMotes.frustumCulled = false;
    const moteSeeds = Array.from({ length: moteCount }, (_, i) => ({
      angle: (i / moteCount) * Math.PI * 2,
      radius: 1.4 + ((i * 7) % 11) * 0.34,
      baseY: -1.6 + ((i * 13) % 15) * 0.28,
      speed: 0.09 + (i % 5) * 0.03,
    }));
    scene.add(instancedMotes);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const handleResize = () => {
      if (!mountEl) return;
      const nextW = Math.max(320, mountEl.clientWidth);
      const nextH = Math.max(360, mountEl.clientHeight);
      camera.aspect = nextW / nextH;
      camera.updateProjectionMatrix();
      renderer.setSize(nextW, nextH);
    };
    window.addEventListener('resize', handleResize);

    let lastPtrMs = 0;
    const handlePointerMove = (ev: PointerEvent) => {
      const now = performance.now();
      if (now - lastPtrMs < 28) return;
      lastPtrMs = now;
      const rect = mountEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerRef.current.x = Math.max(
        -1,
        Math.min(1, ((ev.clientX - rect.left) / rect.width - 0.5) * 2)
      );
      pointerRef.current.y = Math.max(
        -1,
        Math.min(1, ((ev.clientY - rect.top) / rect.height - 0.5) * 2)
      );
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const startMs = performance.now();
    let prevMs = startMs;
    let currentExplode = 0;
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 75);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function tick() {
      if (disposed) return;
      const nowMs = performance.now();
      const dt = Math.min(0.1, Math.max(0.001, (nowMs - prevMs) / 1000));
      prevMs = nowMs;
      const elapsed = (nowMs - startMs) / 1000;
      const motion = prefersReducedMotion ? 0.08 : 1;

      const targetCfg = SCULPTURE_CAMERA_TARGETS[sculptureModeRef.current];
      currentExplode = THREE.MathUtils.damp(
        currentExplode,
        targetCfg.explodeFactor,
        4.2,
        dt
      );

      outerAzimuthGroup.rotation.z = elapsed * 0.09 * motion;
      outerAzimuthGroup.position.z = -currentExplode * 0.95;

      currencyGimbalGroup.rotation.y = elapsed * 0.24 * motion;
      currencyGimbalGroup.rotation.x =
        0.42 + Math.sin(elapsed * 0.35) * 0.14 * motion;
      currencyGimbalGroup.position.z = -currentExplode * 0.25;

      calibrationGroup.rotation.x = -elapsed * 0.32 * motion;
      calibrationGroup.rotation.y = elapsed * 0.19 * motion;
      calibrationGroup.position.z = currentExplode * 0.52;

      goldCageEdges.rotation.y = -elapsed * 0.28 * motion;
      goldCageEdges.rotation.x = elapsed * 0.18 * motion;
      jewelOcta.rotation.y = elapsed * 0.46 * motion;
      jewelOcta.rotation.z = Math.sin(elapsed * 0.6) * 0.2 * motion;
      coreAssembly.position.z = currentExplode * 1.18;

      satellitesGroup.rotation.y = elapsed * 0.16 * motion;
      satellitesGroup.position.y = -currentExplode * 0.3;

      const posArr = wavePosAttr.array as Float32Array;
      for (let i = 0; i < indexPairs.length; i++) {
        const pt = baseGridCoords[indexPairs[i]];
        const radial = Math.sqrt(pt.x * pt.x + pt.z * pt.z);
        const waveY =
          Math.sin(pt.x * 0.62 + elapsed * 0.85 * motion) *
            Math.cos(pt.z * 0.72 + elapsed * 0.55 * motion) *
            0.28 +
          Math.sin(radial * 0.9 - elapsed * 0.7 * motion) * 0.12;
        posArr[i * 3 + 1] = waveY;
      }
      wavePosAttr.needsUpdate = true;

      for (let i = 0; i < moteCount; i++) {
        const s = moteSeeds[i];
        const a = s.angle + elapsed * 0.05 * motion;
        const y = ((s.baseY + elapsed * s.speed * motion + 2.2) % 4.4) - 2.0;
        _dummyMatrixObj.position.set(
          Math.cos(a) * s.radius,
          y,
          Math.sin(a) * s.radius
        );
        const sc = 0.65 + Math.sin(elapsed * 1.3 + i) * 0.28;
        _dummyMatrixObj.scale.setScalar(sc);
        _dummyMatrixObj.rotation.set(elapsed * 0.4, a, 0);
        _dummyMatrixObj.updateMatrix();
        instancedMotes.setMatrixAt(i, _dummyMatrixObj.matrix);
      }
      instancedMotes.instanceMatrix.needsUpdate = true;

      const px = pointerRef.current.x * 0.42;
      const py = -pointerRef.current.y * 0.26;
      _camTargetPos.set(
        targetCfg.pos[0] + px,
        targetCfg.pos[1] + py,
        targetCfg.pos[2]
      );
      _camTargetLook.set(
        targetCfg.look[0],
        targetCfg.look[1],
        targetCfg.look[2]
      );

      const camAlpha = 1 - Math.exp(-3.8 * dt);
      camera.position.lerp(_camTargetPos, camAlpha);
      currentLookAt.lerp(_camTargetLook, camAlpha);
      camera.lookAt(currentLookAt);

      renderer.render(scene, camera);

      if (prefersReducedMotion) return;
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      for (const d of disposables) {
        try {
          d.dispose();
        } catch {
          // ignore cleanup error
        }
      }
      renderer.dispose();
    };
  }, []);

  const languageChoices: Array<{ code: AppLanguage; label: string }> = [
    { code: 'zh-HK', label: '繁體中文' },
    { code: 'zh-CN', label: '简体中文' },
    { code: 'en', label: 'English' },
  ];

  const svgChartGeometry = useMemo(() => {
    const w = 620;
    const h = 210;
    const padL = 14;
    const padR = 16;
    const padT = 18;
    const padB = 26;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const maxVal = Math.max(
      1,
      ...sandboxProjection.points.map((p) => p.projected)
    );
    const xAt = (yr: number) => padL + ((yr - 1) / 29) * plotW;
    const yAt = (val: number) => padT + plotH - (val / maxVal) * plotH;

    const projPath = sandboxProjection.points
      .map(
        (p, idx) =>
          `${idx === 0 ? 'M' : 'L'}${xAt(p.year).toFixed(1)},${yAt(
            p.projected
          ).toFixed(1)}`
      )
      .join(' ');
    const projArea = `${projPath} L${xAt(30).toFixed(1)},${(
      padT + plotH
    ).toFixed(1)} L${xAt(1).toFixed(1)},${(padT + plotH).toFixed(1)} Z`;

    const guarPath = sandboxProjection.points
      .map(
        (p, idx) =>
          `${idx === 0 ? 'M' : 'L'}${xAt(p.year).toFixed(1)},${yAt(
            p.guaranteed
          ).toFixed(1)}`
      )
      .join(' ');

    return { w, h, projPath, projArea, guarPath };
  }, [sandboxProjection]);

  return (
    <div
      data-testid="template-t5-spatial-3d"
      data-camera-preset={sculptureMode}
      className="min-h-screen bg-[#050810] text-[#F5F2EB] pb-24 selection:bg-[#DFBD69] selection:text-[#050810]"
    >
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="mx-auto flex max-w-[1400px] items-center justify-between gap-8 border-b border-white/[0.08] px-6 py-5 lg:px-10">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onEnterWorkbench('stage1');
          }}
          className="text-base font-semibold tracking-tight text-[#F5F2EB] whitespace-nowrap shrink-0"
        >
          HK InsureHub <span className="font-editorial italic text-[#DFBD69]">Pro</span>
        </a>

        <nav
          aria-label="Spatial 3D template navigation"
          className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400"
        >
          <a href="#sandbox" className="hover:text-[#F5F2EB] hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0">
            {t('Actuarial Sandbox', conv('實時精算預覽'))}
          </a>
          <button
            type="button"
            onClick={() => onEnterWorkbench('stage2', 'actuarial_lab')}
            className="hover:text-[#F5F2EB] hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0"
          >
            {t('567 & HIBOR Lab', conv('567 與 HIBOR 精算室'))}
          </button>
          <button
            type="button"
            onClick={() => onEnterWorkbench('stage4', 'microsite')}
            className="hover:text-[#F5F2EB] hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0"
          >
            {t('QR Microsite', conv('QR 互動微網'))}
          </button>
          <button
            type="button"
            onClick={() => onEnterWorkbench('stage1', 'crm')}
            className="hover:text-[#F5F2EB] hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0"
          >
            {t('Client CRM', conv('客戶管線 CRM'))}
          </button>
          <button
            type="button"
            onClick={() => onOpenMemberAuth?.(activeMember ? 'PROFILE' : 'SIGN_IN')}
            className="hover:text-[#F5F2EB] hover:underline underline-offset-8 transition-colors whitespace-nowrap shrink-0"
          >
            {activeMember
              ? t(`Account · ${activeMember.iaLicenseNo}`, conv(`會員 · ${activeMember.iaLicenseNo}`))
              : t('Member Login', conv('會員登入'))}
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            data-testid="landing-top-enter-btn"
            onClick={() => onEnterWorkbench('stage1')}
            className="inline-flex items-center gap-2 rounded-full bg-[#DFBD69] px-5 py-2.5 text-xs font-semibold text-[#050810] hover:bg-[#ebd089] transition-colors whitespace-nowrap shrink-0"
          >
            <span>{t('Enter Workbench', conv('進入顧問工作台'))}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Hero Split + Three.js Horological Astrolabe */}
      <section className="relative mx-auto max-w-[1400px] border-b border-white/[0.08] px-6 lg:px-10">
        <div className="grid grid-cols-1 items-stretch lg:min-h-[720px] lg:grid-cols-12">
          <div className="relative z-10 flex flex-col justify-between border-b border-white/[0.08] py-12 lg:col-span-6 lg:border-r lg:border-b-0 lg:py-16 lg:pr-12">
            <div className="space-y-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs tracking-wide text-slate-400">
                  <span className="text-[#DFBD69]">
                    {t('Spatial WebGL Edition', conv('三維精算渾天儀特別版'))}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>HKIA GL16 / GL28 / GL30</span>
                </div>

                <div
                  role="group"
                  aria-label="Language switcher"
                  className="inline-flex items-center rounded-full border border-white/[0.12] bg-[#0A101D] p-0.5"
                >
                  {languageChoices.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      data-testid={`landing-lang-${opt.code}`}
                      onClick={() => setLang(opt.code)}
                      className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                        lang === opt.code
                          ? 'bg-[#DFBD69] text-[#050810] font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {lang === 'en' ? (
                <h1 className="font-editorial text-[clamp(2.8rem,4.5vw,4.35rem)] leading-[1.04] font-medium tracking-[-0.02em] text-[#F7F4ED] text-balance">
                  Actuarial sovereignty,{' '}
                  <span className="italic text-[#DFBD69]">choreographed</span> in
                  real-time 3D.
                </h1>
              ) : (
                <h1 className="font-editorial text-[clamp(2.3rem,3.75vw,3.5rem)] leading-[1.2] font-semibold tracking-[-0.01em] text-[#F7F4ED] text-balance">
                  {conv('以三維精算渾天儀，統御')}
                  <span className="italic font-medium text-[#DFBD69]">
                    {conv(`全港 ${insurersCount} 間保司`)}
                  </span>
                  {conv('比較、管線排序與合規簽單。')}
                </h1>
              )}

              <p className="max-w-[56ch] text-[15px] leading-[1.72] text-slate-300/90 sm:text-base">
                {t(
                  `Benchmark ${plansCount}+ contracts across ${insurersCount} insurers, inspect exploded horological gimbals, run Google Cloud Vision KYC OCR, and close compliant proposals.`,
                  conv(`即時橫向審核全港 ${insurersCount} 間獲授權保險公司共 ${plansCount}+ 款計劃；配備 Google Cloud Vision 證件 OCR、CRM 階段排序、紅藍黃三線對比及 QR 手機微網。`)
                )}
              </p>
            </div>

            <div className="mt-10 space-y-5 pt-6 border-t border-white/[0.08]">
              <div className="flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  data-testid="landing-enter-workbench-btn"
                  onClick={() => onEnterWorkbench('stage1')}
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#DFBD69] px-6 py-3.5 text-sm font-semibold text-[#050810] hover:bg-[#ebd089] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{t('Launch 6-Stage Workbench', conv('啟動 6 步顧問工作台'))}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  data-testid="landing-open-crm-btn"
                  onClick={() => onEnterWorkbench('stage1', 'crm')}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.18] bg-transparent px-5 py-3.5 text-sm font-medium text-[#F5F2EB] hover:border-[#DFBD69]/70 hover:text-[#DFBD69] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{t(`Sorted Client CRM (${leadsCount})`, conv(`開啟排序 CRM (${leadsCount})`))}</span>
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="text-xs text-slate-400">
                <span>{insurersCount} Insurers</span>
                <span className="mx-2" aria-hidden="true">·</span>
                <span>{plansCount}+ Contracts</span>
                <span className="mx-2" aria-hidden="true">·</span>
                <span>{inForceCount} In-Force Tracked</span>
              </div>
            </div>
          </div>

          <div className="relative flex min-h-[460px] flex-col justify-between lg:col-span-6 lg:min-h-[720px]">
            <div
              ref={canvasMountRef}
              data-testid="harbour-threejs-canvas-mount"
              aria-label="Interactive 3D Sovereign Horological Wealth Astrolabe"
              className="absolute inset-0 h-full w-full"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_46%,rgba(5,8,16,0)_42%,rgba(5,8,16,0.86)_100%)]"
            />
            {webglUnavailable && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#050810] p-8 text-sm text-[#DFBD69]">
                Sovereign Actuarial Astrolabe
              </div>
            )}

            <div className="pointer-events-none relative z-10 flex items-center justify-between px-4 pt-5 lg:px-8 lg:pt-7 text-[11px] text-slate-400">
              <span>{t('FIG. 01 — 12-PART ACTUARIAL ASTROLABE', conv('圖 01 — 十二部件精算渾天儀與收益曲面'))}</span>
              <span className="font-mono text-[#DFBD69]/90 tabular-nums">USD · HKD · RMB</span>
            </div>

            <div className="relative z-10 mx-auto mb-5 w-[94%] max-w-[480px]">
              <div className="flex justify-center">
                <button
                  type="button"
                  data-testid="threejs-dock-toggle-btn"
                  onClick={() => setDockCollapsed((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-t-md border border-b-0 border-white/[0.12] bg-[#080E1A] px-3 py-1 text-[11px] font-medium text-slate-300 hover:text-[#DFBD69] whitespace-nowrap"
                >
                  {dockCollapsed ? (
                    <>
                      <ChevronUp className="h-3 w-3" aria-hidden="true" />
                      <span>{t('3D Camera Modes', conv('展開 3D 視角'))}</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" aria-hidden="true" />
                      <span>{t('Hide 3D Dock', conv('收合視角列'))}</span>
                    </>
                  )}
                </button>
              </div>

              {!dockCollapsed && (
                <div
                  role="group"
                  aria-label="3D choreography modes"
                  className="flex items-center justify-between gap-1 rounded-full border border-white/[0.12] bg-[#080E1A] p-1"
                >
                  {(
                    [
                      { id: 'EQUILIBRIUM' as const, en: '01 Equilibrium', zh: '01 渾天平衡態' },
                      { id: 'EXPLODED' as const, en: '02 Exploded Calibre', zh: '02 機芯分解視圖' },
                      { id: 'TOPOGRAPHY' as const, en: '03 Yield Surface', zh: '03 收益等高曲面' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      data-testid={`threejs-cam-${m.id}`}
                      onClick={() => setSculptureMode(m.id)}
                      className={`flex-1 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                        sculptureMode === m.id
                          ? 'bg-[#DFBD69] text-[#050810] font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t(m.en, conv(m.zh))}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Cantonese Screen-Capture Walkthrough & 6-Step Tutorials Under Hero */}
      <CantoneseTutorialShowcase
        sectionId="t5-tutorial-guide"
        themeVariant="travertine"
        activeMember={activeMember}
        onOpenMemberAuth={onOpenMemberAuth}
        onEnterWorkbench={onEnterWorkbench}
      />

      {/* Compact 30-Year Actuarial Sandbox */}
      <section id="sandbox" className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-5">
            <div className="text-xs text-[#DFBD69]">
              {t('01. Live 30-Year Actuarial Sandbox', conv('01. 30 年分紅實現率壓測沙盒'))}
            </div>
            <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {LANDING_SANDBOX_MANDATES.map((m) => (
                <button
                  key={m.leadId}
                  type="button"
                  data-testid={`sandbox-mandate-${m.leadId}`}
                  onClick={() => setSelectedMandateId(m.leadId)}
                  className={`w-full py-3.5 text-left ${
                    selectedMandateId === m.leadId ? 'text-[#F7F4ED]' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{t(m.clientEn, conv(m.clientZh))}</span>
                    <span className="font-mono text-xs text-[#DFBD69] tabular-nums">{m.gapCoveragePct}% Fit</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">{t(m.profileEn, conv(m.profileZh))}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="inline-flex rounded-lg border border-white/[0.12] bg-[#0A101D] p-1">
                {(['USD', 'HKD', 'RMB'] as CurrencyCode[]).map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    data-testid={`sandbox-currency-${cur}`}
                    onClick={() => setSandboxCurrency(cur)}
                    className={`flex-1 rounded py-1 font-mono text-xs ${
                      sandboxCurrency === cur ? 'bg-[#DFBD69] text-[#050810] font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
              <div className="inline-flex rounded-lg border border-white/[0.12] bg-[#0A101D] p-1">
                {([100, 90, 85] as const).map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    data-testid={`sandbox-stress-${pct}`}
                    onClick={() => setDividendStressPct(pct)}
                    className={`flex-1 rounded py-1 font-mono text-xs ${
                      dividendStressPct === pct ? 'bg-[#DFBD69] text-[#050810] font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              data-testid="sandbox-load-mandate-btn"
              onClick={() => onEnterWorkbench('stage1', undefined, activeMandate.leadId)}
              className="inline-flex w-full items-center justify-between rounded-xl border border-[#DFBD69]/45 bg-[#0C1424] px-5 py-3.5 text-sm font-semibold text-[#F7F4ED] hover:border-[#DFBD69]"
            >
              <span>
                {t(
                  `Open ${activeMandate.clientEn.split('·')[0].trim()} in Full Workbench`,
                  conv(`載入「${activeMandate.clientZh.split('·')[0].trim()}」進入完整顧問工作台`)
                )}
              </span>
              <ArrowRight className="h-4 w-4 text-[#DFBD69]" aria-hidden="true" />
            </button>
          </div>

          <div className="rounded-2xl border border-white/[0.09] bg-[#080E1A] p-6 sm:p-8 lg:col-span-7">
            <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div className="font-editorial text-3xl font-medium text-[#F7F4ED] tabular-nums">
                {sandboxProjection.fxSymbol} {sandboxProjection.year20Projected.toLocaleString()}
                <span className="ml-2 font-sans text-xs font-normal text-slate-400">
                  {t('Yr-20 Projected', conv('第 20 年預期總值'))}
                </span>
              </div>
              <div className="font-mono text-xs text-[#DFBD69] tabular-nums">
                IRR {sandboxProjection.effectiveIrrPct}% (GL28 ≤ {sandboxProjection.gl28CapPct}%)
              </div>
            </div>

            <svg
              viewBox={`0 0 ${svgChartGeometry.w} ${svgChartGeometry.h}`}
              className="my-5 h-48 w-full"
              role="img"
              aria-label="30-year cash value trajectory"
            >
              <defs>
                <linearGradient id="t5GoldArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#DFBD69" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#DFBD69" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={svgChartGeometry.guarPath} fill="none" stroke="#93C5FD" strokeWidth="1.75" />
              <path d={svgChartGeometry.projArea} fill="url(#t5GoldArea)" />
              <path d={svgChartGeometry.projPath} fill="none" stroke="#DFBD69" strokeWidth="2.4" />
            </svg>
          </div>
        </div>
      </section>
    </div>
  );
};

// ============================================================================
// MASTER 5-TEMPLATE SELECTOR HOST + TEMPLATE GALLERY MODAL
// ============================================================================
export const ExecutiveLandingPage3D: React.FC<ExecutiveLandingPage3DProps> = (props) => {
  const { lang, t } = useLanguage();
  const conv = (zh: string) => (lang === 'zh-CN' ? toSimplifiedChinese(zh) : zh);

  const [selectedTemplate, setSelectedTemplate] = useState<LandingTemplateId>(() => {
    if (typeof window === 'undefined') return 'T4_FAMILY_OFFICE_CINEMA';
    const saved = window.localStorage.getItem(LANDING_TEMPLATE_STORAGE_KEY);
    return resolveInitialLandingTemplate(window.location.search, saved);
  });

  const showTemplatePreviewBar = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.has('template') || params.get('templates') === '1';
  }, []);

  const [galleryOpen, setGalleryOpen] = useState<boolean>(false);
  const [switcherMinimized, setSwitcherMinimized] = useState<boolean>(false);

  const handleSelectTemplate = (id: LandingTemplateId) => {
    setSelectedTemplate(id);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LANDING_TEMPLATE_STORAGE_KEY, id);
      } catch {
        // ignore storage quota errors
      }
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  };

  return (
    <div
      data-testid="executive-landing-page"
      data-active-template={selectedTemplate}
      className="relative min-h-screen"
    >
      {/* Render Active Selected Template (01 – 05) */}
      {selectedTemplate === 'T1_DAYLIGHT_FINTECH' && (
        <Template01DaylightStudio
          {...props}
          onOpenTemplateGallery={() => setGalleryOpen(true)}
        />
      )}
      {selectedTemplate === 'T2_ARCHIVAL_BROADSHEET' && (
        <Template02ArchivalBroadsheet
          {...props}
          onOpenTemplateGallery={() => setGalleryOpen(true)}
        />
      )}
      {selectedTemplate === 'T3_SWISS_INTERNATIONAL' && (
        <Template03SwissInternational
          {...props}
          onOpenTemplateGallery={() => setGalleryOpen(true)}
        />
      )}
      {selectedTemplate === 'T4_FAMILY_OFFICE_CINEMA' && (
        <Template04FamilyOfficeCinema
          {...props}
          onOpenTemplateGallery={() => setGalleryOpen(true)}
        />
      )}
      {selectedTemplate === 'T5_SPATIAL_KINETIC_3D' && (
        <Template05SpatialHorology3D {...props} />
      )}

      {/* Optional Template Switcher Bar (only shown when ?templates=1 or ?template= is in URL) */}
      {showTemplatePreviewBar && (
      <div
        data-testid="landing-template-switcher-bar"
        className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 max-w-[96vw]"
      >
        {switcherMinimized ? (
          <button
            type="button"
            data-testid="expand-template-switcher-btn"
            onClick={() => setSwitcherMinimized(false)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-slate-900 whitespace-nowrap"
          >
            <LayoutGrid className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
            <span>{t('Switch Landing Template (5 Styles)', conv('切換首頁模板（共 5 款風格）'))}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full border border-slate-700/90 bg-slate-950 px-2.5 py-1.5 text-white shadow-2xl overflow-x-auto">
            <button
              type="button"
              data-testid="open-template-gallery-btn"
              onClick={() => setGalleryOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-amber-300 hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t('Compare All 5', conv('5 款總覽'))}</span>
            </button>

            <div
              role="group"
              aria-label="Select one of 5 landing page templates"
              className="flex items-center gap-1"
            >
              {LANDING_TEMPLATES_CATALOG.map((tpl) => {
                const active = selectedTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    data-testid={`select-template-${tpl.id}`}
                    aria-pressed={active}
                    onClick={() => handleSelectTemplate(tpl.id)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-slate-950'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {tpl.shortCode} · {t(tpl.pillLabelEn, conv(tpl.pillLabelZh))}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              aria-label={t('Minimize template switcher', conv('收合模板切換列'))}
              onClick={() => setSwitcherMinimized(true)}
              className="ml-1 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white shrink-0"
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      )}

      {/* =====================================================================
          5-TEMPLATE SIDE-BY-SIDE SELECTION GALLERY MODAL
          ===================================================================== */}
      {galleryOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('Select Landing Page Template', conv('選擇首頁設計模板（共 5 款）'))}
          data-testid="landing-template-gallery-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 sm:p-6"
        >
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 sm:p-8 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <div className="text-xs font-semibold text-amber-300">
                  {t('5 Bespoke Landing Page Directions', conv('5 款截然不同的首頁視覺模板（自動記憶選擇）'))}
                </div>
                <h2 className="mt-1 text-2xl font-bold text-white">
                  {t(
                    'Pick your preferred landing page aesthetic',
                    conv('點擊任一風格即時套用並設為預設首頁')
                  )}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close template gallery"
                onClick={() => setGalleryOpen(false)}
                className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {LANDING_TEMPLATES_CATALOG.map((tpl) => {
                const isSelected = selectedTemplate === tpl.id;
                const swatchMap: Record<LandingTemplateId, string> = {
                  T1_DAYLIGHT_FINTECH: 'bg-[#F8FAFC] border-slate-300 text-slate-900',
                  T2_ARCHIVAL_BROADSHEET: 'bg-[#F6F2EA] border-stone-400 text-[#1C1917]',
                  T3_SWISS_INTERNATIONAL: 'bg-white border-zinc-950 text-zinc-950',
                  T4_FAMILY_OFFICE_CINEMA: 'bg-[#141210] border-[#C59B5F] text-[#FAF6F0]',
                  T5_SPATIAL_KINETIC_3D: 'bg-[#050810] border-[#DFBD69] text-[#F5F2EB]',
                };
                return (
                  <div
                    key={tpl.id}
                    className={`flex flex-col justify-between rounded-xl border p-5 transition-colors ${
                      isSelected
                        ? 'border-amber-400 bg-slate-800/90'
                        : 'border-slate-800 bg-slate-950/70 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      {/* Mini Visual Swatch Header */}
                      <div
                        className={`mb-4 flex h-20 items-center justify-between rounded-lg border px-4 ${swatchMap[tpl.id]}`}
                      >
                        <span className="font-mono text-xs font-bold">
                          TEMPLATE {tpl.shortCode}
                        </span>
                        <span className="text-xs font-semibold">
                          {tpl.isLightTheme
                            ? t('Light Canvas', conv('淺色紙本／日光'))
                            : t('Dark Cinema / 3D', conv('深色攝影／3D'))}
                        </span>
                      </div>

                      <div className="text-xs font-medium text-slate-400">
                        {t(tpl.studioReferenceEn, conv(tpl.studioReferenceZh))}
                      </div>
                      <h3 className="mt-1 text-lg font-bold text-white">
                        {tpl.shortCode}. {t(tpl.nameEn, conv(tpl.nameZh))}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-slate-300">
                        {t(tpl.summaryEn, conv(tpl.summaryZh))}
                      </p>
                    </div>

                    <button
                      type="button"
                      data-testid={`gallery-apply-${tpl.id}`}
                      onClick={() => {
                        handleSelectTemplate(tpl.id);
                        setGalleryOpen(false);
                      }}
                      className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-white hover:bg-slate-700'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t('Active Template', conv('目前使用中'))}</span>
                        </>
                      ) : (
                        <span>{t('Select & Preview', conv('套用此模板'))}</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
