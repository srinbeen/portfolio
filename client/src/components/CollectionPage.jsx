import { useEffect, useState, useRef } from 'react'
import "../styles/CollectionPage.css"

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, useGLTF, OrbitControls, Text, ScreenSpace } from '@react-three/drei'

import * as THREE from 'three'
import { smoothstep } from 'three/src/math/MathUtils.js'

const vinylAnimStateEnum = {
  WAITING: 0,
  CHANGING: 1,
  ANIMATING: 2
}

const initRotOffset = -Math.PI/4

function createMesh(node, ref) {
  return (
    <group ref={ ref }>
    {node.children.length ? 
      node.children.map((c, idx) => (
        <mesh key={c.uuid} geometry={c.geometry} material={c.material} />
      )) :
      <mesh key={node.uuid} geometry={node.geometry} material={node.material} />
    }
    </group>
  )
}

function Lighting() {
  const targetObject = useRef()

  return (
    <>
      <ambientLight />
      <spotLight intensity={20} position={[0, 2, 3]} angle={Math.PI/6} target-position={[0, 2, 0]} />
    </>
  )
}

function Vinyl({ rel, idx, node, selectedVinylState, animState }) {
  const [selectedVinyl, setSelectedVinyl] = selectedVinylState

  const localRef = useRef(null)
  const clock = useRef()

  const sepScale = 0.2
  const columnOffset = idx % 4
  const rowOffset = Math.floor(idx / 4)
  const topOfShelf = 0.56
  const nextShelf = 0.37
  const shelfStart = -0.3

  const homePos = [shelfStart + columnOffset * sepScale, topOfShelf - (rowOffset * nextShelf) , 0]

  const clickEvent = (e) => {
    const { intersections } = e;
    if (animState.current !== vinylAnimStateEnum.WAITING) { return }
    else if (selectedVinyl.cur && selectedVinyl.cur.meshRef === localRef) { return }

    else if (intersections[0].eventObject === localRef.current) {
      setSelectedVinyl(p => ({ cur: { rel: rel, meshRef: localRef }, prev: p.cur }))
    }
  }

  return (
    <group ref={ localRef } 
      rotation={ [0, initRotOffset, 0] }
      scale={ [0.75, 0.75, 0.75] }
      position={ homePos }
      onClick={ clickEvent } >
        { node.children.map((c, idx) => (
            <mesh key={c.uuid} geometry={c.geometry} material={c.material} />
          ))
        }
    </group>
  )
}


function Bookshelf({ node }) {
  const meshRef = useRef()

  return createMesh(node, meshRef)
}

function VinylCollection({ collectionState, selectedVinylState, nodes, orbit, animState }) {
  const [collection, setCollection] = collectionState
  const [selectedVinyl, setSelectedVinyl] = selectedVinylState

  const clock = useRef()
  const rayCur = useRef()
  const rayCam = useRef()
  const rayPrev = useRef(null)
  const rayIdle = useRef(null)

  const { camera } = useThree()
  const lookAtVector = new THREE.Vector3()
  
  const moveTime = 0.5
  const camPosTime = 0.75
  const camLookTime = 0.85

  const pullVector = new THREE.Vector3(0, 0, 0.75)

  const rotTime = 1.5
  const numRotationsOut = 2
  const numRotationsBack = 1

  useEffect(() => {
    animState.current = vinylAnimStateEnum.CHANGING
  }, [selectedVinyl])

  useFrame(() => {
    switch (animState.current) {
      case vinylAnimStateEnum.WAITING:
        if (!selectedVinyl.cur) { return }

        if (clock.current.running === false) {
          clock.current = new THREE.Clock()
          rayIdle.current = {
            posRay: new THREE.Ray(selectedVinyl.cur.meshRef.current.position.clone(), new THREE.Vector3(0, 1, 0)),
            posPathLength: 0.01,
            elapsed: 0
          }
        }

        rayIdle.current.elapsed = clock.current.getElapsedTime()
        selectedVinyl.cur.meshRef.current.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), 0.1)
        rayIdle.current.posRay.at(Math.sin(rayIdle.current.elapsed * 2) * rayIdle.current.posPathLength, selectedVinyl.cur.meshRef.current.position)

        break
      
      case vinylAnimStateEnum.CHANGING:
        if (!selectedVinyl.cur && !selectedVinyl.prev) { 
          animState.current = vinylAnimStateEnum.WAITING
          return
        }

        if (selectedVinyl.cur) { 
          const posStart = selectedVinyl.cur.meshRef.current.position.clone()
          const posEnd = posStart.clone().add(pullVector)
          const posPath = posEnd.clone().sub(posStart)
          const posPathLength = posPath.length()
          
          rayCur.current = {
            posRay: new THREE.Ray(posStart, posPath.normalize()),
            posPathLength: posPathLength
          }

          const camStartPos = new THREE.Vector3()
          camera.getWorldPosition(camStartPos)
          const camFinalPos = posEnd.clone().add(new THREE.Vector3(0.2, 0, 1))
          const camPath = camFinalPos.clone().sub(camStartPos)
          const camPathLength = camPath.length()
                  
          const lookStart = orbit.current.target
          // const lookFinal = selectedVinyl.cur.meshRef.current.position.clone().add(new THREE.Vector3(0, 0, 0))
          const lookFinal = camFinalPos.clone().add(new THREE.Vector3(0, 0, -1))
          lookFinal.add(new THREE.Vector3(0, 0, 0.5))
          const lookPath = lookFinal.clone().sub(lookStart)
          const lookPathLength = lookPath.length()
          
          rayCam.current = {
            posRay: new THREE.Ray(camStartPos, camPath.normalize()),
            posPathLength: camPathLength,
            lookRay: new THREE.Ray(lookStart, lookPath.normalize()),
            lookPathLength: lookPathLength
          }
        }
        else {
          const camStartPos = new THREE.Vector3()
          camera.getWorldPosition(camStartPos)
          const camFinalPos = new THREE.Vector3(0, 0, 4)
          const camPath = camFinalPos.clone().sub(camStartPos)
          const camPathLength = camPath.length()
                  
          const lookStart = orbit.current.target
          const lookFinal = new THREE.Vector3(0, 0, 0)
          const lookPath = lookFinal.clone().sub(lookStart)
          const lookPathLength = lookPath.length()
          
          rayCam.current = {
            posRay: new THREE.Ray(camStartPos, camPath.normalize()),
            posPathLength: camPathLength,
            lookRay: new THREE.Ray(lookStart, lookPath.normalize()),
            lookPathLength: lookPathLength
          }
        }

        if (selectedVinyl.prev) {
          const posStart = new THREE.Vector3()
          rayIdle.current.posRay.at(Math.sin(rayIdle.current.elapsed * 2) * rayIdle.current.posPathLength, posStart)
          const posEnd = new THREE.Vector3()
          rayIdle.current.posRay.at(0, posEnd)
          posEnd.sub(pullVector)
          const posPath = posEnd.clone().sub(posStart)
          const posPathLength = posPath.length()

          rayPrev.current = {
            posRay: new THREE.Ray(posStart, posPath.normalize()),
            posPathLength: posPathLength
          }
        }

        orbit.current.enabled = false

        clock.current = new THREE.Clock()
        animState.current = vinylAnimStateEnum.ANIMATING
        break
      
      case vinylAnimStateEnum.ANIMATING:
        const elapsed = clock.current.getElapsedTime()

        if (selectedVinyl.cur) {
          rayCur.current.posRay.at(smoothstep(elapsed / moveTime, 0, 1) * rayCur.current.posPathLength, selectedVinyl.cur.meshRef.current.position)
          selectedVinyl.cur.meshRef.current.rotation.set(0, initRotOffset - smoothstep(elapsed / rotTime, 0, 1) * (numRotationsOut * 2 * Math.PI + initRotOffset - Math.PI / 2), 0)
        }
        if (selectedVinyl.prev) {
          rayPrev.current.posRay.at(smoothstep(elapsed / moveTime, 0, 1) * rayPrev.current.posPathLength, selectedVinyl.prev.meshRef.current.position)
          selectedVinyl.prev.meshRef.current.rotation.set(0, - Math.PI / 2 + smoothstep(elapsed / rotTime, 0, 1) * (numRotationsBack * 2 * Math.PI + Math.PI / 2 + initRotOffset), 0)
        }

        rayCam.current.posRay.at(smoothstep(elapsed / camPosTime, 0, 1) * rayCam.current.posPathLength, camera.position)
        rayCam.current.lookRay.at(smoothstep(elapsed / camLookTime, 0, 1) * rayCam.current.lookPathLength, lookAtVector)
        camera.lookAt(lookAtVector)
        
        orbit.current.target = lookAtVector

        if (elapsed >= Math.max(moveTime, camPosTime, camLookTime, rotTime)) {
          clock.current.stop()
          // orbit.current.enabled = true
          animState.current = vinylAnimStateEnum.WAITING
        }
        break
    }
  })


  return (
    <>
      <group scale={[1, 1, 1]}>
        <Bookshelf node={ nodes.Bookshelf } />
        { collection.map((rel, idx) => (
            <Vinyl key={ rel.instance_id } 
              rel={ rel } idx={ idx } node={ nodes.Vinyl }
              selectedVinylState={ selectedVinylState } animState={ animState }
            />
          ))
        }
      </group>
    </>
  )
}

function CollectionPage() {
  const collectionState = useState([])
  const [collection, setCollection] = collectionState
  const [collectionLoaded, setCollectionLoaded] = useState(false)

  const selectedVinylState = useState({ cur: null, prev: null })
  const [selectedVinyl, setSelectedVinyl] = selectedVinylState

  const animState = useRef(vinylAnimStateEnum.WAITING)

  const { nodes, materials, isLoading } = useGLTF('/vinyl.glb')

  const orbit = useRef()
  
  useEffect(() => {
    try {
      fetchCollection()
      setCollectionLoaded(true)
    } catch (err) {
      console.error(err)
    }
  }, [])
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)

    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [])
  
  async function fetchCollection() {
    const resString = await fetch("http://localhost:5000/collection")
    const res = await resString.json()
    if (res.success) {
      console.log("successfully fetched collection")
      setCollection(p => res.data.releases)
    }
  }

  function handleKeyPress(e) {
    if (e.key === 'Escape' && animState.current === vinylAnimStateEnum.WAITING) {
      console.log(selectedVinyl.cur)
      setSelectedVinyl(p => ({ cur: null, prev: p.cur }))
    }
  }
  
  return (collectionLoaded && !isLoading) ? (
    <>
      <div style={{ width: '100vw', height: '100vh' }}>
        <Canvas camera={{ fov: 30 }} scene={{ }}>
          <Lighting />
          <VinylCollection collectionState={ collectionState } selectedVinylState={ selectedVinylState } nodes={ nodes } orbit={ orbit } animState={ animState } />
          <OrbitControls ref={ orbit } />
        </Canvas>
      </div>
      { selectedVinyl.cur ?
        <div className='collection-item'>
          <img className='thumbnail' src={selectedVinyl.cur.rel.basic_information.cover_image} />
          <div className='header'>
            <p className='title'>{selectedVinyl.cur.rel.basic_information.title}</p>
            <p className='artist'>{selectedVinyl.cur.rel.basic_information.artists[0].name}</p>
          </div>
        </div> :
        <div className='collection-item'>
          <h1>Select a track!</h1>
        </div>
      }
    </>
  ) : (
    <h1>Loading...</h1>
  )
}

export default CollectionPage