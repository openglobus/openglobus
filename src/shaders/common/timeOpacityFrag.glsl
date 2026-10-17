#ifdef USE_TIME
in float v_timeDelta;
uniform vec2 timeOpacity;

float timeAlpha() {
    return v_timeDelta <= 0.0 ? timeOpacity.x : timeOpacity.y;
}
#else
float timeAlpha() {
    return 1.0;
}
#endif
