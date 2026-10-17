#ifdef USE_TIME
in ivec2 pathTime;
uniform ivec2 timeCut;
out float v_timeDelta;
#define WRITE_TIME_DELTA v_timeDelta = float(pathTime.x - timeCut.x) * 1048576.0 + float(pathTime.y - timeCut.y)
#define COLLAPSE_REPEATED_POINT(prev, current, next, screen, clip) if (distance(prev.xyz, current.xyz) < 0.01 && distance(next.xyz, current.xyz) < 0.01) { gl_Position = vec4((2.0 * screen / viewport - 1.0) * clip.w, clip.z, clip.w); return; }
#else
#define WRITE_TIME_DELTA
#define COLLAPSE_REPEATED_POINT(prev, current, next, screen, clip)
#endif
