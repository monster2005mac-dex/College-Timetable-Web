package com.example.collegetimetable.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PointMode
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.input.pointer.pointerInput
import kotlin.math.cos
import kotlin.math.sin

/** 3D Vector Representation */
private data class Vec3(val x: Float, val y: Float, val z: Float)

/** Floating Particle in 3D Space */
private data class Particle3D(
    var x: Float,
    var y: Float,
    var z: Float,
    val speed: Float,
    val size: Float,
    val color: Color
)

/**
 * Interactive 3D Canvas Background brought 100% from the Web App (ThreeCanvas.tsx).
 * Renders rotating 3D wireframe geometric structures and floating ambient particles.
 * Responds to user drag gestures for real-time 3D rotation.
 */
@Composable
fun ThreeDInteractiveBackground(
    accentColor: Color,
    modifier: Modifier = Modifier,
    enableTouchRotation: Boolean = true
) {
    var userRotX by remember { mutableFloatStateOf(0f) }
    var userRotY by remember { mutableFloatStateOf(0f) }

    val infiniteTransition = rememberInfiniteTransition(label = "3d_rotation")
    val autoRot by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = (2 * Math.PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(14000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "auto_rot"
    )

    // Generate 3D Icosahedron / Geometric Mesh Vertices
    val phi = (1.0f + Math.sqrt(5.0).toFloat()) / 2.0f
    val baseScale = 140f
    val rawVertices = remember {
        listOf(
            Vec3(-1f, phi, 0f), Vec3(1f, phi, 0f), Vec3(-1f, -phi, 0f), Vec3(1f, -phi, 0f),
            Vec3(0f, -1f, phi), Vec3(0f, 1f, phi), Vec3(0f, -1f, -phi), Vec3(0f, 1f, -phi),
            Vec3(phi, 0f, -1f), Vec3(phi, 0f, 1f), Vec3(-phi, 0f, -1f), Vec3(-phi, 0f, 1f)
        ).map { Vec3(it.x * baseScale, it.y * baseScale, it.z * baseScale) }
    }

    // Outer Ring Vertices
    val ringSegments = 16
    val ringRadius = 260f
    val ringVertices = remember {
        (0 until ringSegments).map { i ->
            val angle = (i.toFloat() / ringSegments) * 2 * Math.PI.toFloat()
            Vec3(cos(angle.toDouble()).toFloat() * ringRadius, 0f, sin(angle.toDouble()).toFloat() * ringRadius)
        }
    }

    // Wireframe Edges connecting icosahedron vertices
    val edges = remember {
        listOf(
            0 to 1, 0 to 5, 0 to 7, 0 to 10, 0 to 11,
            1 to 5, 1 to 7, 1 to 8, 1 to 9,
            2 to 3, 2 to 4, 2 to 6, 2 to 10, 2 to 11,
            3 to 4, 3 to 6, 3 to 8, 3 to 9,
            4 to 5, 4 to 9, 4 to 11,
            5 to 9, 5 to 11,
            6 to 7, 6 to 8, 6 to 10,
            7 to 8, 7 to 10,
            8 to 9, 10 to 11
        )
    }

    // Floating 3D ambient particles
    val particles = remember {
        List(40) {
            Particle3D(
                x = (Math.random().toFloat() - 0.5f) * 600f,
                y = (Math.random().toFloat() - 0.5f) * 800f,
                z = (Math.random().toFloat() - 0.5f) * 400f,
                speed = 0.5f + Math.random().toFloat() * 1.5f,
                size = 3f + Math.random().toFloat() * 6f,
                color = if (it % 2 == 0) accentColor else Color.White
            )
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .then(
                if (enableTouchRotation) {
                    Modifier.pointerInput(Unit) {
                        detectTransformGestures { _, pan, _, _ ->
                            userRotY += pan.x * 0.008f
                            userRotX -= pan.y * 0.008f
                        }
                    }
                } else Modifier
            )
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val width = size.width
            val height = size.height
            val centerX = width / 2f
            val centerY = height / 2.8f // Position elevated slightly above screen center

            val rotX = autoRot * 0.4f + userRotX
            val rotY = autoRot * 0.7f + userRotY
            val rotZ = autoRot * 0.2f

            val cosX = cos(rotX.toDouble()).toFloat()
            val sinX = sin(rotX.toDouble()).toFloat()
            val cosY = cos(rotY.toDouble()).toFloat()
            val sinY = sin(rotY.toDouble()).toFloat()
            val cosZ = cos(rotZ.toDouble()).toFloat()
            val sinZ = sin(rotZ.toDouble()).toFloat()

            fun transform3D(v: Vec3): Vec3 {
                // Yaw (Y)
                val x1 = v.x * cosY + v.z * sinY
                val y1 = v.y
                val z1 = -v.x * sinY + v.z * cosY

                // Pitch (X)
                val x2 = x1
                val y2 = y1 * cosX - z1 * sinX
                val z2 = y1 * sinX + z1 * cosX

                // Roll (Z)
                val x3 = x2 * cosZ - y2 * sinZ
                val y3 = x2 * sinZ + y2 * cosZ
                val z3 = z2

                return Vec3(x3, y3, z3)
            }

            val focalLength = 500f

            fun project(v: Vec3): Offset {
                val p = transform3D(v)
                val zDist = p.z + focalLength + 300f
                val scale = focalLength / zDist
                return Offset(centerX + p.x * scale, centerY + p.y * scale)
            }

            // Draw outer ring wireframe
            val ringProjected = ringVertices.map { project(it) }
            for (i in ringProjected.indices) {
                val nextI = (i + 1) % ringProjected.size
                drawLine(
                    color = accentColor.copy(alpha = 0.22f),
                    start = ringProjected[i],
                    end = ringProjected[nextI],
                    strokeWidth = 1.5f,
                    cap = StrokeCap.Round
                )
            }

            // Draw inner icosahedron wireframe edges
            val projectedVertices = rawVertices.map { project(it) }
            for ((startIdx, endIdx) in edges) {
                val p1 = projectedVertices[startIdx]
                val p2 = projectedVertices[endIdx]

                drawLine(
                    brush = Brush.linearGradient(
                        colors = listOf(
                            accentColor.copy(alpha = 0.45f),
                            Color.White.copy(alpha = 0.25f)
                        ),
                        start = p1,
                        end = p2
                    ),
                    start = p1,
                    end = p2,
                    strokeWidth = 2.2f,
                    cap = StrokeCap.Round
                )
            }

            // Draw vertex nodes
            drawPoints(
                points = projectedVertices,
                pointMode = PointMode.Points,
                color = accentColor,
                strokeWidth = 7f,
                cap = StrokeCap.Round
            )

            // Draw floating particles
            particles.forEach { p ->
                p.y -= p.speed
                if (p.y < -400f) p.y = 400f

                val proj = project(Vec3(p.x, p.y, p.z))
                drawCircle(
                    color = p.color.copy(alpha = 0.4f),
                    radius = p.size,
                    center = proj
                )
            }
        }
    }
}
