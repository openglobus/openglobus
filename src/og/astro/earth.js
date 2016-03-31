goog.provide('og.astro.earth');

goog.require('og.astro');
goog.require('og.jd');
goog.require('og.math');
goog.require('og.math.Quaternion');
goog.require('og.math.Vector3');
goog.require('og.orbit');
goog.require('og.rotation');

/**
 * http://stjarnhimlen.se/comp/tutorial.html
 *  a  Mean distance, or semi-major axis
 *  e  Eccentricity
 *  T  Time at perihelion
 *
 *  q  Perihelion distance  = a * (1 - e)    
 *  Q  Aphelion distance    = a * (1 + e)
 *
 *  i  Inclination, i.e. the "tilt" of the orbit relative to the
 *     ecliptic.  The inclination varies from 0 to 180 degrees. If
 *     the inclination is larger than 90 degrees, the planet is in
 *     a retrogade orbit, i.e. it moves "backwards".  The most
 *     well-known celestial body with retrogade motion is Comet Halley.
 *
 *  N  (usually written as "Capital Omega") Longitude of Ascending
 *     Node. This is the angle, along the ecliptic, from the Vernal
 *     Point to the Ascending Node, which is the intersection between
 *     the orbit and the ecliptic, where the planet moves from south
 *     of to north of the ecliptic, i.e. from negative to positive
 *     latitudes.
 *
 *  w  (usually written as "small Omega") The angle from the Ascending
 *     node to the Perihelion, along the orbit.
 *
 *  P  Orbital period       = 365.256898326 * a**1.5/sqrt(1+m) days,
 *     where m = the mass of the planet in solar masses (0 for
 *     comets and asteroids). sqrt() is the square root function.
 *    
 *  n  Daily motion         = 360_deg / P    degrees/day
 *
 *  t  Some epoch as a day count, e.g. Julian Day Number. The Time
 *     at Perihelion, T, should then be expressed as the same day count.
 *
 *  t - T   Time since Perihelion, usually in days
 *
 *  M  Mean Anomaly         = n * (t - T)  =  (t - T) * 360_deg / P
 *     Mean Anomaly is 0 at perihelion and 180 degrees at aphelion
 *
 *  L  Mean Longitude       = M + w + N
 *
 *  E  Eccentric anomaly, defined by Kepler's equation:   M = E - e * sin(E)
 *     An auxiliary angle to compute the position in an elliptic orbit
 *
 *  v  True anomaly: the angle from perihelion to the planet, as seen
 *     from the Sun
 *
 *  r  Heliocentric distance: the planet's distance from the Sun.
 *
 *  x,y,z  Rectangular coordinates. Used e.g. when a heliocentric
 *         position (seen from the Sun) should be converted to a
 *         corresponding geocentric position (seen from the Earth).
 */
og.astro.earth.getSunPosition = function (jd) {

    var d = jd - og.jd.J2000;

    var w = 282.9404 + 4.70935E-5 * d;                  //longitude of perihelion
    var a = 1.000000;                                   //mean distance, a.u.
    var e = 0.016709 - 1.151E-9 * d;                    //eccentricity
    var M = og.math.rev(356.0470 + 0.9856002585 * d);   //mean anomaly

    var oblecl = og.astro.J2000_OBLIQUITY - 3.563E-7 * d; //obliquity of the ecliptic

    var L = og.math.rev(w + M); //Sun's mean longitude

    var E = M + og.math.DEGREES * e * Math.sin(M * og.math.RADIANS) * (1 + e * Math.cos(M * og.math.RADIANS)); //eccentric anomaly

    //Sun rectangular coordiantes, where the X axis points towards the perihelion
    var x = Math.cos(E * og.math.RADIANS) - e;
    var y = Math.sin(E * og.math.RADIANS) * Math.sqrt(1 - e * e);

    var r = Math.sqrt(x * x + y * y);           // distance
    var v = Math.atan2(y, x) * og.math.DEGREES; // true anomaly

    var lon = og.math.rev(v + w); //longitude of the Sun

    //the Sun's ecliptic rectangular coordinates
    x = r * Math.cos(lon * og.math.RADIANS);
    y = r * Math.sin(lon * og.math.RADIANS);

    //We use oblecl, and rotate these coordinates
    var xequat = x;
    var yequat = y * Math.cos(oblecl * og.math.RADIANS);
    var zequat = y * Math.sin(oblecl * og.math.RADIANS);

    var theta = og.math.TWO_PI * (d * 24.0 / 23.9344694 - 259.853 / 360.0); // Siderial spin time

    return og.math.Quaternion.yRotation(-theta).mulVec3(new og.math.Vector3(-yequat * og.astro.AU_TO_METERS,
        zequat * og.astro.AU_TO_METERS, -xequat * og.astro.AU_TO_METERS));

    //Convert to RA and Decl
    //var RA = Math.atan2(yequat, xequat) * og.math.DEGREES;
    //var Decl = Math.atan2(zequat, Math.sqrt(xequat * xequat + yequat * yequat)) * og.math.DEGREES;
};
