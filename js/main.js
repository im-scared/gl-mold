const shaders = {
    vert: {
        noop: '',
    },
    frag: {
        noop: '',
    },
}

const typeSizes = {}

function loadTypes(gl) {
    typeSizes[gl.FLOAT] = 4
}

async function loadShaders() {
    const fetchShader = async (shaderType, shaderName) => {
        const deferred = new $.Deferred()

        const request = $.ajax({
            url: `glsl/${shaderName}.${shaderType}`,
            dataType: 'text',
        })

        request.done((data) => {
            shaders[shaderType][shaderName] = data
            deferred.resolve()
        })

        request.fail((xhr, status, error) => {
            deferred.reject(error)
        })

        return deferred.promise()
    }

    const shaderPromises = Object.getOwnPropertyNames(shaders)
        .flatMap(shaderType =>
            Object.getOwnPropertyNames(shaders[shaderType]).map(shaderName =>
                fetchShader(shaderType, shaderName)))

    return Promise.all(shaderPromises)
}

async function loadPrecursors(gl) {
    loadTypes(gl)
    await loadShaders()
}

function createShader(gl, type, name) {
    let shaderType = type === 'vert' ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER;
    const shader = gl.createShader(shaderType)
    gl.shaderSource(shader, shaders[type][name])
    gl.compileShader(shader)
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    if (success) {
        return shader
    }

    const error = `Failed to create shader [type:${type}][name:${name}]: ${gl.getShaderInfoLog(shader)}`
    gl.deleteShader(shader)
    throw error
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram()
    gl.attachShader(program, createShader(gl, 'vert', vertexShader))
    gl.attachShader(program, createShader(gl, 'frag', fragmentShader))
    gl.linkProgram(program)
    const success = gl.getProgramParameter(program, gl.LINK_STATUS)
    if (success) {
        return program
    }

    const error = `Failed to create program: ${gl.getProgramInfoLog(program)}`
    gl.deleteProgram(program)
    throw error
}

function setupVao(gl, vaoDescriptor, buffer) {

    gl.bindVertexArray(vaoDescriptor.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

    let offset = 0;
    Object.getOwnPropertyNames(vaoDescriptor.attribs).forEach(attribName => {
        const attrib = vaoDescriptor.attribs[attribName]
        gl.enableVertexAttribArray(attrib.location);
        gl.vertexAttribPointer(
            attrib.location,
            attrib.numComponents,
            attrib.type,
            false,
            vaoDescriptor.stride,
            offset);

        /* Note that we're cheating a little bit here: if the buffer has some irrelevant data
           between the attributes that we're interested in, calculating the offset this way
           would not work. However, in this demo, buffers are laid out in such a way that this code works :) */
        offset += attrib.numComponents * typeSizes[attrib.type];
    })

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
}

function withAttribLocations(gl, program, attribs) {
    Object.getOwnPropertyNames(attribs).forEach(attribName => {
        attribs[attribName].location = gl.getAttribLocation(program, attribName)
    })

    return attribs
}

function withStride(gl, vaoDescriptor) {
    const attribs = vaoDescriptor.attribs
    let stride = 0
    Object.getOwnPropertyNames(attribs).forEach(attrib => {
        const type = attribs[attrib].type
        const components = attribs[attrib].numComponents
        stride += typeSizes[type] * components
    })

    vaoDescriptor.stride = stride

    return vaoDescriptor
}

function getInitialBufferData() {
    const data = [
        0, 0,
        0, 0.5,
        0.5, 0,
    ]
    return data
}

function init(gl) {
    const renderProgram = createProgram(gl, 'noop', 'noop');

    let renderAttribs = withAttribLocations(gl, renderProgram, {
        i_Position: {
            type: gl.FLOAT,
            numComponents: 2,
        }
    })

    let buffer = gl.createBuffer()

    const vao = gl.createVertexArray()
    const vaoDescriptor = withStride(gl, {
        vao: vao,
        attribs: renderAttribs,
    })
    setupVao(gl, vaoDescriptor, buffer, renderAttribs)

    const initialData = new Float32Array(getInitialBufferData())
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, initialData, gl.STATIC_DRAW)

    gl.clearColor(0.0, 0.0, 0.0, 1.0)

    /* Set up blending */
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    return {
        program: renderProgram,
        vao: vao,
        fps: 0,
        lastSecond: 0,
    }
}

function animate(gl, state) {
    window.requestAnimationFrame((millis) => render(gl, state, millis))
}

function render(gl, state, millis) {

    let currentSecond = Math.floor(millis / 1000)
    if (state.lastSecond !== currentSecond) {
        $("#fps").text(`${state.fps} FPS`)
        state.fps = 0
        state.lastSecond = currentSecond
    } else {
        state.fps++
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(state.program);
    gl.bindVertexArray(state.vao);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    animate(gl, state)
}

async function main() {
    const canvas = document.querySelector("#canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        document.write("WebGL2 is not supported by your browser")
    }

    await loadPrecursors(gl)

    const state = init(gl)

    animate(gl, state)
}
