const shaders = {
    shadersToLoad: [
        "step",
        "render",
    ]
}

const typeSizes = {}

function loadTypes(gl) {
    typeSizes[gl.FLOAT] = 4
}

function orElse(value, predicate, altValue) {
    return predicate(value) ? value : altValue
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

    shaders.vert = {}
    shaders.frag = {}

    const shaderPromises = shaders.shadersToLoad
        .flatMap(shaderName =>
            ['vert', 'frag'].map(shaderType =>
                fetchShader(shaderType, shaderName)
            )
        )

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

function createProgram(gl, vertexShader, fragmentShader, attribs = null) {
    const program = gl.createProgram()
    gl.attachShader(program, createShader(gl, 'vert', vertexShader))
    gl.attachShader(program, createShader(gl, 'frag', fragmentShader))

    if (attribs) {
        gl.transformFeedbackVaryings(
            program,
            Object.getOwnPropertyNames(attribs).map(attribName => attribName.replace(/^i/, 'v')),
            gl.INTERLEAVED_ATTRIBS)
    }

    gl.linkProgram(program)
    const success = gl.getProgramParameter(program, gl.LINK_STATUS)
    if (success) {
        return program
    }

    const error = `Failed to create program: ${gl.getProgramInfoLog(program)}`
    gl.deleteProgram(program)
    throw error
}

function setupVao(gl, buffer, stride, attribs) {
    let vao = gl.createVertexArray()
    initVaoAttribs(gl, vao, buffer, stride, attribs)
    return vao
}

function initVaoAttribs(gl, vao, buffer, stride, attribs) {
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

    let offset = 0;
    Object.getOwnPropertyNames(attribs).forEach(attribName => {
        const attrib = attribs[attribName]
        gl.enableVertexAttribArray(attrib.location);
        gl.vertexAttribPointer(
            attrib.location,
            attrib.numComponents,
            attrib.type,
            false,
            stride,
            offset);

        offset += attrib.numComponents * typeSizes[attrib.type];
    })

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
}

function getStride(gl, attribs) {
    let stride = 0
    Object.getOwnPropertyNames(attribs).forEach(attrib => {
        const type = attribs[attrib].type
        const components = attribs[attrib].numComponents
        stride += typeSizes[type] * components
    })

    return stride
}

function withAttribLocations(gl, program, attribs) {
    Object.getOwnPropertyNames(attribs).forEach(attribName => {
        attribs[attribName].location = gl.getAttribLocation(program, attribName)
    })

    return attribs
}

function getInitialBufferData(numSpores) {
    const data = []

    for (let i = 0; i < numSpores; i++) {
        data.push(0.0) // pos.x
        data.push(0.0) // pos.y

        const theta = Math.random() * 2 * Math.PI
        const speed = 200
        data.push(speed * Math.cos(theta)) // vel.x
        data.push(speed * Math.sin(theta)) // vel.y
    }

    return data
}

function init(
    gl,
    canvas,
    numSpores,
) {
    const protoRenderAttribs = {
        i_Position: {
            type: gl.FLOAT,
            numComponents: 2,
        },
    };
    const protoStepAttribs = {
        ...protoRenderAttribs,
        i_Velocity: {
            type: gl.FLOAT,
            numComponents: 2,
        },
    }

    const stepProgram = createProgram(gl, 'step', 'step', protoStepAttribs);
    const renderProgram = createProgram(gl, 'render', 'render');

    const stepAttribs = withAttribLocations(gl, stepProgram, protoStepAttribs)
    const renderAttribs = withAttribLocations(gl, renderProgram, protoRenderAttribs)

    const stride = getStride(gl, protoStepAttribs)

    const buffers = {
        read: gl.createBuffer(),
        write: gl.createBuffer(),
    }

    const vaos = {
        step: {
            read: setupVao(gl, buffers.read, stride, stepAttribs),
            write: setupVao(gl, buffers.write, stride, stepAttribs),
        },
        render: {
            read: setupVao(gl, buffers.read, stride, renderAttribs),
            write: setupVao(gl, buffers.write, stride, renderAttribs),
        },
    }

    const initialData = new Float32Array(getInitialBufferData(numSpores))
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.read)
    gl.bufferData(gl.ARRAY_BUFFER, initialData, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.write)
    gl.bufferData(gl.ARRAY_BUFFER, initialData, gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)

    gl.clearColor(0.0, 0.0, 0.0, 1.0)

    /* Set up blending */
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    return {
        programs: {
            step: stepProgram,
            render: renderProgram,
        },
        buffers: buffers,
        vaos: vaos,
        canvas: canvas,
        numSpores: numSpores,
        fps: 0,
        lastSecond: 0,
        lastMillis: 0,
    }
}

function animate(gl, state) {
    window.requestAnimationFrame((millis) => render(gl, state, millis))
}

function swap(obj) {
    const tmp = obj.read
    obj.read = obj.write
    obj.write = tmp
}

function setUniforms(gl, program, uniformSpec) {
    Object.getOwnPropertyNames(uniformSpec).forEach(uniform => {
        const components = uniformSpec[uniform]
        const uniformLocation = gl.getUniformLocation(program, uniform);
        if (!Array.isArray(components)) {
            gl.uniform1f(uniformLocation, components)
        } else {
            switch (components.length) {
                case 2:
                    gl.uniform2f(uniformLocation, components[0], components[1])
                    break;
            }
        }
    })
}

function renderGl(gl, state, millis, timeDelta) {
    gl.viewport(0, 0, state.canvas.width, state.canvas.height)

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(state.programs.step);
    gl.bindVertexArray(state.vaos.step.read);

    setUniforms(gl, state.programs.step, {
        u_Resolution: [state.canvas.width, state.canvas.height],
        u_Time: millis / 1000.0,
        u_TimeDelta: timeDelta / 1000.0,
    })

    // transform
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, state.buffers.write);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, state.numSpores);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);

    // render
    gl.useProgram(state.programs.render);
    gl.bindVertexArray(state.vaos.render.read)

    setUniforms(gl, state.programs.render, {
        u_Resolution: [state.canvas.width, state.canvas.height],
    })

    gl.drawArrays(gl.POINTS, 0, state.numSpores);

    swap(state.buffers)
    swap(state.vaos.step)
    swap(state.vaos.render)
}

function render(gl, state, millis) {

    const currentSecond = Math.floor(millis / 1000)
    if (state.lastSecond !== currentSecond) {
        $("#fps").text(`${state.fps} FPS`)
        state.fps = 0
        state.lastSecond = currentSecond
    } else {
        state.fps++
    }

    const timeDelta = orElse(millis - state.lastMillis, v => v < 1000, 1000)
    state.lastMillis = millis

    state.canvas.width = state.canvas.clientWidth
    state.canvas.height = state.canvas.clientHeight

    renderGl(gl, state, millis, timeDelta);

    animate(gl, state)
}

async function main() {
    const canvas = document.querySelector("#canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        document.write("WebGL2 is not supported by your browser")
    }

    await loadPrecursors(gl)

    const state = init(
        gl,
        canvas,
        100000, // number of mold spores
    )

    animate(gl, state)
}
