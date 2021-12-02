
      attribute vec2 aPosition;
        
      uniform mat4 uProjectionMatrix;
      uniform mat4 uViewMatrix;
      void main () {       
        gl_Position = vec4(aPosition, 0.0, 1.0);      
      }
      
