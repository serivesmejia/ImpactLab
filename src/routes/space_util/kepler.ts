import * as THREE from 'three';

export const AU = 149597870.7; export const SCALE = 100; export const KM_TO_UNITS = (SCALE / AU);
export function au(x: number){ return x * SCALE; }

function deg2rad(d: number){return d*Math.PI/180;}
function keplerE(M: number, e: number){ let E=M; for(let i=0;i<8;i++){E=E-(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));} return E; }

export function elementsToPosition(a: number, e: number, i: number, O: number, w: number, Mdeg: number) {
    // convierte a radianes
    const M = THREE.MathUtils.degToRad(Mdeg);
    const inc = THREE.MathUtils.degToRad(i);
    const Omega = THREE.MathUtils.degToRad(O);
    const omega = THREE.MathUtils.degToRad(w);

    // resuelve la ecuación de Kepler: M = E - e*sin(E)
    let E = M;
    for (let j = 0; j < 6; j++) {
        E = M + e * Math.sin(E);
    }

    // convierte E a anomalía verdadera ν
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);
    const sqrt = Math.sqrt(1 - e * e);
    const cosν = (cosE - e) / (1 - e * cosE);
    const sinν = (sqrt * sinE) / (1 - e * cosE);
    const ν = Math.atan2(sinν, cosν);

    // distancia radial
    const r = a * (1 - e * cosE);

    // posición en el plano orbital
    const x_orb = r * Math.cos(ν);
    const y_orb = r * Math.sin(ν);

    // rotación por ω, i, Ω
    const x = r * (Math.cos(Omega) * Math.cos(omega + ν) - Math.sin(Omega) * Math.sin(omega + ν) * Math.cos(inc));
    const y = r * (Math.sin(Omega) * Math.cos(omega + ν) + Math.cos(Omega) * Math.sin(omega + ν) * Math.cos(inc));
    const z = r * (Math.sin(inc) * Math.sin(omega + ν));

    return new THREE.Vector3(au(x), au(z), au(y)); // z↔y para alineación visual
}
