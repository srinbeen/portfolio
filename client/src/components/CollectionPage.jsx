import { useEffect, useState, useRef } from 'react'
import "../styles/CollectionPage.css"

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, useGLTF, OrbitControls, Text, ScreenSpace } from '@react-three/drei'

import * as THREE from 'three'
import { smootherstep } from 'three/src/math/MathUtils.js'

const vinylAnimStateEnum = {
  WAIT: 0,
  SETUPSELECT: 1,
  SELECT: 2,
  SETUPPAGEPREV: 3,
  SETUPPAGENEXT: 4,
  PAGE: 5
}

const initRotOffset = -Math.PI/4
const vinylsPerPage = 7

const lorem = 'Quas ipsum temporibus eos non. Rerum dolore mollitia praesentium consequatur. Cumque officiis aut aliquid earum sunt velit. Accusantium eos nemo commodi officia. Fugit ad nostrum minima fuga sit quae a.'

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

  const targetRef = useRef()

  return (
    <>
      <object3D ref={ targetRef } position={[0, 0.5, 0]}/>
      <ambientLight />
      <spotLight intensity={10} position={[0, 1, 3]} angle={ Math.PI/9 } target={ targetRef.current ? targetRef.current : new THREE.Object3D() } />
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
    if (animState.current !== vinylAnimStateEnum.WAIT) { return }
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


function ImportedMesh({ node }) {
  const meshRef = useRef()

  return createMesh(node, meshRef)
}

function VinylCollection({ collectionState, pageState, selectedVinylState, nodes, orbit, animState }) {
  const [collection, setCollection] = collectionState
  const [page, setPage] = pageState
  const [selectedVinyl, setSelectedVinyl] = selectedVinylState

  const jointRef = useRef()

  const clock = useRef()
  const rayCur = useRef()
  const rayCam = useRef()
  const rayPrev = useRef(null)
  const rayIdle = useRef(null)
  const rayPage = useRef([false, 0])

  const { camera } = useThree()
  const lookAtVector = new THREE.Vector3()
  
  const moveTime = 0.5
  const camPosTime = 0.75
  const camLookTime = 0.85

  const pullVector = new THREE.Vector3(0, 0, 0.75)

  const rotTime = 1.5
  const numRotationsOut = 2
  const numRotationsBack = 1

  const shelfRotHalfTime = 1

  useEffect(() => {
    animState.current = vinylAnimStateEnum.SETUPSELECT
  }, [selectedVinyl])

  useFrame(() => {
    let elapsed

    switch (animState.current) {
      case vinylAnimStateEnum.WAIT:
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
      
        case vinylAnimStateEnum.SETUPPAGENEXT:
          rayPage.current[1] = 1
          clock.current = new THREE.Clock()
          animState.current = vinylAnimStateEnum.PAGE
          
          break
          
          case vinylAnimStateEnum.SETUPPAGEPREV:
            rayPage.current[1] = -1
            clock.current = new THREE.Clock()
            animState.current = vinylAnimStateEnum.PAGE
            
            break
        
        case vinylAnimStateEnum.PAGE:
          elapsed = clock.current.getElapsedTime()
          
          const transformedElapsed = smootherstep((elapsed / (2 * shelfRotHalfTime)), 0, 1)
          const yRotation = rayPage.current[1] * 2 * transformedElapsed * Math.PI
          const stable = 1/Math.pow(Math.E, 5)

          if (transformedElapsed <= 0.5) {
            jointRef.current.rotation.set(0, yRotation, 0)
          }
          else if (rayPage.current[0] === false) {
            jointRef.current.rotation.set(0, yRotation, 0)
            setPage(p => p+rayPage.current[1])
            rayPage.current[0] = true
          }
          else if (transformedElapsed <= 1-stable) {
            jointRef.current.rotation.set(0, yRotation, 0)
          }
          else {
            jointRef.current.rotation.set(0, 0, 0)
            rayPage.current = [false, 0]
            clock.current.stop()

            animState.current = vinylAnimStateEnum.WAIT
          }

          break
      
      case vinylAnimStateEnum.SETUPSELECT:
        if (!selectedVinyl.cur && !selectedVinyl.prev) { 
          animState.current = vinylAnimStateEnum.WAIT
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
        animState.current = vinylAnimStateEnum.SELECT
        break
      
      case vinylAnimStateEnum.SELECT:
        elapsed = clock.current.getElapsedTime()

        if (selectedVinyl.cur) {
          rayCur.current.posRay.at(smootherstep(elapsed / moveTime, 0, 1) * rayCur.current.posPathLength, selectedVinyl.cur.meshRef.current.position)
          selectedVinyl.cur.meshRef.current.rotation.set(0, initRotOffset - smootherstep(elapsed / rotTime, 0, 1) * (numRotationsOut * 2 * Math.PI + initRotOffset - Math.PI / 2), 0)
        }
        if (selectedVinyl.prev) {
          rayPrev.current.posRay.at(smootherstep(elapsed / moveTime, 0, 1) * rayPrev.current.posPathLength, selectedVinyl.prev.meshRef.current.position)
          selectedVinyl.prev.meshRef.current.rotation.set(0, - Math.PI / 2 + smootherstep(elapsed / rotTime, 0, 1) * (numRotationsBack * 2 * Math.PI + Math.PI / 2 + initRotOffset), 0)
        }

        rayCam.current.posRay.at(smootherstep(elapsed / camPosTime, 0, 1) * rayCam.current.posPathLength, camera.position)
        rayCam.current.lookRay.at(smootherstep(elapsed / camLookTime, 0, 1) * rayCam.current.lookPathLength, lookAtVector)
        camera.lookAt(lookAtVector)
        
        orbit.current.target = lookAtVector

        if (elapsed >= Math.max(moveTime, camPosTime, camLookTime, rotTime)) {
          clock.current.stop()
          // orbit.current.enabled = true
          animState.current = vinylAnimStateEnum.WAIT
        }
        break
    }
  })


  return (
    <>
      <ImportedMesh node={ nodes.Wall } />
      <ImportedMesh node={ nodes.Backdrop } />
      <group ref={ jointRef } scale={[1, 1, 1]}>
        <ImportedMesh node={ nodes.Bookshelf } />
        { collection.slice(page * vinylsPerPage, Math.min((page + 1) * vinylsPerPage, collection.length)).map((rel, idx) => (
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
  const collectionState = useState(null)
  const [collection, setCollection] = collectionState
  const pageState = useState(0)
  const [page, setPage] = pageState
  const [loaded, setLoaded] = useState(false)

  const selectedVinylState = useState({ cur: null, prev: null })
  const [selectedVinyl, setSelectedVinyl] = selectedVinylState

  const animState = useRef(vinylAnimStateEnum.WAIT)

  const { nodes, materials, isLoading } = useGLTF('/vinyl.glb')

  const orbit = useRef()
  
  useEffect(() => {
    try {
      fetchCollection()
    } catch (err) {
      console.error(err)
    }
  }, [])
  useEffect(() => {
    window.addEventListener('keydown', handleESC)

    return () => {
      window.removeEventListener('keydown', handleESC)
    }
  }, [])


  useEffect(() => {
    if (collection && !isLoading) {
      setLoaded(true)
    }
  }, [collection, isLoading])
  
  
  async function fetchCollection() {
    const resString = await fetch("http://localhost:5000/collection")
    const res = await resString.json()
    if (res.success) {
      console.log("successfully fetched collection")
      setCollection(p => res.data.releases)
    }
  }

  function handleESC(e) {
    if (e.key === 'Escape' && animState.current === vinylAnimStateEnum.WAIT) {
      setSelectedVinyl(p => ({ cur: null, prev: p.cur }))
    }
  }

  function handlePaging(dir) {
    if (animState.current !== vinylAnimStateEnum.WAIT || selectedVinyl.cur) { return }
    else if (dir === -1 && page-1 >= 0) {
      animState.current = vinylAnimStateEnum.SETUPPAGEPREV
    }
    else if (dir === 1 && page+1 <= Math.floor(collection.length / vinylsPerPage)) {
      animState.current = vinylAnimStateEnum.SETUPPAGENEXT
    }
  }
  
  return loaded ? (
    <div style={{ width: '100vw', height: '90vh' }}>
      <Canvas camera={{ fov: 30 }}>
        <Lighting />
        <VinylCollection collectionState={ collectionState } pageState={ pageState } selectedVinylState={ selectedVinylState } nodes={ nodes } orbit={ orbit } animState={ animState } />
        <OrbitControls ref={ orbit } enabled={ false } />
      </Canvas>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems:'center', backgroundColor:'#92b27b' }}>
        <button style={{ padding:'8px', margin:'4px', borderRadius:'4px', backgroundColor:'#ea6a54' }} onClick={ () => handlePaging(-1) }>Prev</button>
        <button style={{ padding:'8px', margin:'4px', borderRadius:'4px', backgroundColor:'#7bdd35' }} onClick={ () => handlePaging(1) }>Next</button>
        <p style={{ margin:'24px' }} onClick={ () => handlePaging(-1) }>{page+1}/{Math.floor(collection.length / vinylsPerPage)+1}</p>
      </div>
      { selectedVinyl.cur ?
        <div className='collection-item'>
          <div className='header'>
            <img className='thumbnail' src={selectedVinyl.cur.rel.basic_information.cover_image} />
            <div className='header-info'>
              <p className='title'>{selectedVinyl.cur.rel.basic_information.title}</p>
              <p className='artist'>{selectedVinyl.cur.rel.basic_information.artists[0].name}</p>
            </div>
          </div>
          <p className='tracks'>{lorem}</p>
        </div> :
        <div className='collection-item none'>
          <h1 style={{ margin:'8px' }}>Select a track!</h1>
        </div>
      }
    </div>
  ) : (
    <h1>Loading...</h1>
  )
}

export default CollectionPage