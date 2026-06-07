import { useState, useEffect } from 'react';

export function useJumpMechanics(
  cameraFps,
  videoFps,
  takeoffTime,
  landingTime,
  bodyMass,
  legLength,
  boxTouchdownTime = 0,
  landingCorrectionMs = 0,
  jumpType = 'cmj',
  boxHeight = 30,
  useManualFrameDuration = false,
  manualFrameDuration = 0.033
) {
  const [stats, setStats] = useState({
    heightCm: '',
    heightInches: '',
    flightTime: '',
    takeoffVelocity: '',
    meanPower: '',
    harmanPeakPower: '',
    harmanMeanPower: '',
    sayersPeakPower: '',
    pushAcceleration: '',
    pushDuration: '',
    contactTime: '',
    rsi: '',
  });

  useEffect(() => {
    if (takeoffTime > 0 && landingTime > takeoffTime) {
      // 1. Extract the raw video time delta
      const videoDeltaTime = Math.abs(landingTime - takeoffTime);

      // 2. Apply Slow-Motion Scaling Factor / check if based on frame numbers
      let rawFlightTime;
      if (useManualFrameDuration && manualFrameDuration > 0) {
        // Frame-based calculation using the cameraFps
        const takeoffFrame = takeoffTime * videoFps;
        const landingFrame = landingTime * videoFps;
        rawFlightTime = Math.abs(landingFrame - takeoffFrame) / cameraFps;
      } else {
        // Timestamp-based calculation:
        rawFlightTime = videoDeltaTime * (videoFps / cameraFps);
      }
      const realFlightTime = Math.max(0.01, rawFlightTime - (parseFloat(landingCorrectionMs) || 0) / 1000);

      // 3. Physical Constants & Parameters
      const g = 9.81;
      const mass = parseFloat(bodyMass) || 70;
      
      // Sanity check: if leg length seems to be in cm (> 2), convert to meters
      let rawLeg = parseFloat(legLength) || 1.0;
      if (rawLeg > 2) rawLeg = rawLeg / 100;
      const pushDistance = rawLeg * 0.45; // Est. push-off displacement

      // 4. Calculate the true vertical jump height:
      const heightMeters = 1.22625 * Math.pow(realFlightTime, 2);
      const heightCm = heightMeters * 100;
      const heightInches = heightCm * 0.393701;

      // Takeoff Velocity (m/s)
      const v_takeoff = Math.sqrt(2 * g * heightMeters);

      // Mean Force during takeoff (Samozino model)
      const meanForce = mass * g * (heightMeters / pushDistance + 1);

      // Mean Power (Samozino model)
      const power = meanForce * (v_takeoff / 2);

      // Peak & Mean Power (Sayers and Harman empirical equations)
      const sayersPeak = 60.7 * heightCm + 45.3 * mass - 2055;
      const harmanPeak = 61.9 * heightCm + 36.0 * mass - 1822;
      const harmanMean = 21.2 * heightCm + 23.0 * mass - 1393;

      // Push-off dynamics
      const pushAcc = Math.pow(v_takeoff, 2) / (2 * pushDistance); // m/s^2
      const pushDur = (2 * pushDistance) / v_takeoff; // seconds

      // Drop Jump Calculations (RSI & Contact Time)
      let contactTimeSec = 0;
      let rsiVal = 0;
      if (jumpType === 'dj' && boxTouchdownTime > 0 && takeoffTime > boxTouchdownTime) {
        if (useManualFrameDuration && manualFrameDuration > 0) {
          const contactFrames = (takeoffTime - boxTouchdownTime) * videoFps;
          contactTimeSec = contactFrames / cameraFps;
        } else {
          contactTimeSec = (takeoffTime - boxTouchdownTime) * (videoFps / cameraFps);
        }
        if (contactTimeSec > 0) {
          rsiVal = (heightCm / 100) / contactTimeSec; // RSI = height (m) / contact time (s)
        }
      }

      setStats({
        heightCm: heightCm.toFixed(2),
        heightInches: heightInches.toFixed(2),
        flightTime: realFlightTime.toFixed(3),
        takeoffVelocity: v_takeoff.toFixed(2),
        meanPower: power.toFixed(2),
        harmanPeakPower: Math.max(0, harmanPeak).toFixed(2),
        harmanMeanPower: Math.max(0, harmanMean).toFixed(2),
        sayersPeakPower: Math.max(0, sayersPeak).toFixed(2),
        pushAcceleration: pushAcc.toFixed(2),
        pushDuration: pushDur.toFixed(3),
        contactTime: contactTimeSec > 0 ? contactTimeSec.toFixed(3) : '',
        rsi: rsiVal > 0 ? rsiVal.toFixed(2) : '',
      });
    } else {
      setStats({
        heightCm: '',
        heightInches: '',
        flightTime: '',
        takeoffVelocity: '',
        meanPower: '',
        harmanPeakPower: '',
        harmanMeanPower: '',
        sayersPeakPower: '',
        pushAcceleration: '',
        pushDuration: '',
        contactTime: '',
        rsi: '',
      });
    }
  }, [cameraFps, videoFps, takeoffTime, landingTime, bodyMass, legLength, boxTouchdownTime, landingCorrectionMs, jumpType, boxHeight, useManualFrameDuration, manualFrameDuration]);

  return stats;
}
