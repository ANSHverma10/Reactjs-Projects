import React, { useEffect, useRef } from 'react';
import './blob.css'

const BlobComponent = () => {
  const canvasRef = useRef(null);
  const blobRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const blob = new Blob();

    blobRef.current = blob;
    blob.canvas = canvas;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      const pos = blob.center;
      const diff = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      const dist = Math.sqrt(diff.x * diff.x + diff.y * diff.y);
      let angle = null;

      blob.mousePos = { x: pos.x - e.clientX, y: pos.y - e.clientY };

      if (dist < blob.radius && !blob.hover) {
        const vector = { x: e.clientX - pos.x, y: e.clientY - pos.y };
        angle = Math.atan2(vector.y, vector.x);
        blob.hover = true;
      } else if (dist > blob.radius && blob.hover) {
        const vector = { x: e.clientX - pos.x, y: e.clientY - pos.y };
        angle = Math.atan2(vector.y, vector.x);
        blob.hover = false;
        blob.color = null;
      }

      if (typeof angle === 'number') {
        let nearestPoint = null;
        let distanceFromPoint = 100;

        blob.points.forEach(point => {
          if (Math.abs(angle - point.azimuth) < distanceFromPoint) {
            nearestPoint = point;
            distanceFromPoint = Math.abs(angle - point.azimuth);
          }
        });

        if (nearestPoint) {
          const oldMousePoint = blob.oldMousePoint;
          let strength = { x: oldMousePoint.x - e.clientX, y: oldMousePoint.y - e.clientY };
          strength = Math.sqrt(strength.x * strength.x + strength.y * strength.y) * 10;
          if (strength > 100) strength = 100;
          nearestPoint.acceleration = strength / 100 * (blob.hover ? -1 : 1);
        }
      }

      blob.oldMousePoint = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('pointermove', handleMouseMove);

    resizeCanvas();
    blob.init();
    blob.render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('pointermove', handleMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} touch-action="none" />;
};

class Blob {
  constructor() {
    this.points = [];
    this.hover = false;
    this.oldMousePoint = { x: 0, y: 0 };
  }

  init() {
    for (let i = 0; i < this.numPoints; i++) {
      let point = new Point(this.divisional * (i + 1), this);
      this.push(point);
    }
  }

  render() {
    const ctx = this.ctx;
    const pointsArray = this.points;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    pointsArray[0].solveWith(pointsArray[this.numPoints - 1], pointsArray[1]);

    let p0 = pointsArray[this.numPoints - 1].position;
    let p1 = pointsArray[0].position;
    let _p2 = p1;

    ctx.beginPath();
    ctx.moveTo(this.center.x, this.center.y);
    ctx.moveTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);

    for (let i = 1; i < this.numPoints; i++) {
      pointsArray[i].solveWith(pointsArray[i - 1], pointsArray[i + 1] || pointsArray[0]);

      let p2 = pointsArray[i].position;
      const xc = (p1.x + p2.x) / 2;
      const yc = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, xc, yc);

      ctx.fillStyle = '#000000';

      p1 = p2;
    }

    const xc = (p1.x + _p2.x) / 2;
    const yc = (p1.y + _p2.y) / 2;
    ctx.quadraticCurveTo(p1.x, p1.y, xc, yc);

    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = '#000000';

    requestAnimationFrame(this.render.bind(this));
  }

  push(item) {
    if (item instanceof Point) {
      this.points.push(item);
    }
  }

  set color(value) {
    this._color = value;
  }

  get color() {
    return this._color || '#000000';
  }

  set canvas(value) {
    if (value instanceof HTMLElement && value.tagName.toLowerCase() === 'canvas') {
      this._canvas = value;
      this.ctx = this._canvas.getContext('2d');
    }
  }

  get canvas() {
    return this._canvas;
  }

  set numPoints(value) {
    if (value > 2) {
      this._points = value;
    }
  }

  get numPoints() {
    return this._points || 32;
  }

  set radius(value) {
    if (value > 0) {
      this._radius = value;
    }
  }

  get radius() {
    return this._radius || 150;
  }

  set position(value) {
    if (typeof value === 'object' && value.x && value.y) {
      this._position = value;
    }
  }

  get position() {
    return this._position || { x: 0.5, y: 0.5 };
  }

  get divisional() {
    return (Math.PI * 2) / this.numPoints;
  }

  get center() {
    return { x: this.canvas.width * this.position.x, y: this.canvas.height * this.position.y };
  }

  set running(value) {
    this._running = value === true;
  }

  get running() {
    return this.running !== false;
  }
}

class Point {
  constructor(azimuth, parent) {
    this.parent = parent;
    this.azimuth = Math.PI - azimuth;
    this._components = {
      x: Math.cos(this.azimuth),
      y: Math.sin(this.azimuth),
    };

    this.acceleration = -0.3 + Math.random() * 0.6;
  }

  solveWith(leftPoint, rightPoint) {
    this.acceleration =
      (-0.3 * this.radialEffect +
        (leftPoint.radialEffect - this.radialEffect) +
        (rightPoint.radialEffect - this.radialEffect)) *
        this.elasticity -
      this.speed * this.friction;
  }

  set acceleration(value) {
    if (typeof value === 'number') {
      this._acceleration = value;
      this.speed += this._acceleration * 2;
    }
  }

  get acceleration() {
    return this._acceleration || 0;
  }

  set speed(value) {
    if (typeof value === 'number') {
      this._speed = value;
      this.radialEffect += this._speed * 5;
    }
  }

  get speed() {
    return this._speed || 0;
  }

  set radialEffect(value) {
    if (typeof value === 'number') {
      this._radialEffect = value;
    }
  }

  get radialEffect() {
    return this._radialEffect || 0;
  }

  get position() {
    return {
      x: this.parent.center.x + this.components.x * (this.parent.radius + this.radialEffect),
      y: this.parent.center.y + this.components.y * (this.parent.radius + this.radialEffect),
    };
  }

  get components() {
    return this._components;
  }

  set elasticity(value) {
    if (typeof value === 'number') {
      this._elasticity = value;
    }
  }

  get elasticity() {
    return this._elasticity || 0.001;
  }

  set friction(value) {
    if (typeof value === 'number') {
      this._friction = value;
    }
  }

  get friction() {
    return this._friction || 0.0085;
  }
}

export default BlobComponent;
