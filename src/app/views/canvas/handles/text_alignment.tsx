// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as Hammer from "hammerjs";
import {
  Graphics,
  Specification,
  Prototypes,
  Point,
  Geometry,
  ZoomInfo
} from "../../../core";
import * as globals from "../../globals";
import { classNames } from "../../utils";
import { PopupView } from "../../controllers";
import { EditableTextView } from "../../components";
import { renderSVGPath } from "../../renderer";
import { HandlesDragContext, HandleViewProps } from "./handles/common";
import { InputCurveHandleView } from "./handles/input_curve";

const POINT_SIZE = 3;
const POINT_GHOST_SIZE = 6;

export interface HandlesViewProps {
  zoom: ZoomInfo;
  active?: boolean;
  visible?: boolean;
  handles: Prototypes.Handles.Description[];
  isAttributeSnapped?: (attribute: string) => boolean;
  onDragStart?: (
    handle: Prototypes.Handles.Description,
    ctx: HandlesDragContext
  ) => void;
}

export interface HandlesViewState {}

export class HandlesView extends React.Component<
  HandlesViewProps,
  HandlesViewState
> {
  public renderHandle(handle: Prototypes.Handles.Description) {
    let isHandleSnapped = false;
    if (this.props.isAttributeSnapped) {
      for (const action of handle.actions) {
        if (action.type == "attribute") {
          isHandleSnapped =
            isHandleSnapped || this.props.isAttributeSnapped(action.attribute);
        }
      }
    }

    switch (handle.type) {
      case "point": {
        return (
          <PointHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={this.props.visible}
            snapped={isHandleSnapped}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.Point}
          />
        );
      }
      case "line": {
        return (
          <LineHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={this.props.visible}
            snapped={isHandleSnapped}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.Line}
          />
        );
      }
      case "relative-line": {
        return (
          <RelativeLineHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={this.props.visible}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.RelativeLine}
          />
        );
      }
      case "gap-ratio": {
        return (
          <GapRatioHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={false}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.GapRatio}
          />
        );
      }
      case "margin": {
        return (
          <MarginHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={this.props.visible}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.Margin}
          />
        );
      }
      case "angle": {
        return (
          <AngleHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={this.props.visible}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.Angle}
          />
        );
      }
      case "distance-ratio": {
        return (
          <DistanceRatioHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={this.props.visible}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.DistanceRatio}
          />
        );
      }
      case "text-alignment": {
        return (
          <TextAlignmentHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={this.props.visible}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.TextAlignment}
          />
        );
      }
      case "input-curve": {
        return (
          <InputCurveHandleView
            zoom={this.props.zoom}
            active={this.props.active}
            visible={this.props.visible}
            onDragStart={this.props.onDragStart}
            handle={handle as Prototypes.Handles.InputCurve}
          />
        );
      }
    }
  }

  public render() {
    return (
      <g>
        {this.props.handles.map((b, idx) => (
          <g key={`m${idx}`}>{this.renderHandle(b)}</g>
        ))}
      </g>
    );
  }
}

export interface PointHandleViewProps extends HandleViewProps {
  handle: Prototypes.Handles.Point;
}

export interface PointHandleViewState {
  dragging: boolean;
  newXValue: number;
  newYValue: number;
}

export class PointHandleView extends React.Component<
  PointHandleViewProps,
  PointHandleViewState
> {
  public refs: {
    circle: SVGCircleElement;
  };
  public hammer: HammerManager;

  constructor(props: PointHandleViewProps) {
    super(props);
    this.state = {
      dragging: false,
      newXValue: this.props.handle.x,
      newYValue: this.props.handle.y
    };
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.circle);
    this.hammer.add(new Hammer.Pan());

    let context: HandlesDragContext = null;
    let oldXValue: number;
    let oldYValue: number;
    let dXIntegrate: number = 0;
    let dXLast: number = 0;
    let dYIntegrate: number = 0;
    let dYLast: number = 0;

    this.hammer.on("panstart", e => {
      context = new HandlesDragContext();
      oldXValue = this.props.handle.x;
      oldYValue = this.props.handle.y;
      dXLast = 0;
      dYLast = 0;
      dXIntegrate = 0;
      dYIntegrate = 0;
      this.setState({
        dragging: true,
        newXValue: oldXValue,
        newYValue: oldYValue
      });
      if (this.props.onDragStart) {
        this.props.onDragStart(this.props.handle, context);
      }
    });
    this.hammer.on("pan", e => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        const newXValue = dXIntegrate + oldXValue;
        const newYValue = dYIntegrate + oldYValue;
        this.setState({
          newXValue,
          newYValue
        });
        context.emit("drag", { x: newXValue, y: newYValue });
      }
    });
    this.hammer.on("panend", e => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        const newXValue = dXIntegrate + oldXValue;
        const newYValue = dYIntegrate + oldYValue;
        context.emit("end", { x: newXValue, y: newYValue });
        this.setState({
          dragging: false
        });
        context = null;
      }
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public render() {
    const { handle } = this.props;
    const { x, y } = Geometry.applyZoom(this.props.zoom, {
      x: handle.x,
      y: -handle.y
    });
    const { x: hx, y: hy } = Geometry.applyZoom(this.props.zoom, {
      x: this.state.newXValue,
      y: -this.state.newYValue
    });
    return (
      <g
        ref="circle"
        className={classNames(
          "handle",
          "handle-point",
          ["active", this.state.dragging],
          ["snapped", this.props.snapped],
          ["visible", handle.visible || this.props.visible]
        )}
      >
        <circle
          className="element-shape handle-ghost"
          cx={x}
          cy={y}
          r={POINT_GHOST_SIZE}
        />
        <circle
          className="element-shape handle-highlight"
          cx={x}
          cy={y}
          r={POINT_SIZE}
        />
        {this.state.dragging ? (
          <g>
            <line
              className={`element-line handle-hint`}
              x1={hx}
              y1={hy}
              x2={x}
              y2={y}
            />
            <circle
              className={`element-shape handle-hint`}
              cx={hx}
              cy={hy}
              r={POINT_SIZE}
            />
          </g>
        ) : null}
      </g>
    );
  }
}

export interface LineHandleViewProps extends HandleViewProps {
  handle: Prototypes.Handles.Line;
}

export interface LineHandleViewState {
  dragging: boolean;
  newValue: number;
}

export class LineHandleView extends React.Component<
  LineHandleViewProps,
  LineHandleViewState
> {
  public refs: {
    line: SVGLineElement;
  };
  public hammer: HammerManager;

  constructor(props: LineHandleViewProps) {
    super(props);
    this.state = {
      dragging: false,
      newValue: this.props.handle.value
    };
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.line);
    this.hammer.add(new Hammer.Pan({ threshold: 1 }));

    let context: HandlesDragContext = null;
    let oldValue: number;
    let dXIntegrate: number = 0;
    let dXLast: number = 0;
    let dYIntegrate: number = 0;
    let dYLast: number = 0;

    this.hammer.on("panstart", e => {
      context = new HandlesDragContext();
      oldValue = this.props.handle.value;
      dXLast = 0;
      dYLast = 0;
      dXIntegrate = 0;
      dYIntegrate = 0;
      this.setState({
        dragging: true,
        newValue: oldValue
      });
      if (this.props.onDragStart) {
        this.props.onDragStart(this.props.handle, context);
      }
    });
    this.hammer.on("pan", e => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        const newValue =
          (this.props.handle.axis == "x" ? dXIntegrate : dYIntegrate) +
          oldValue;
        this.setState({
          newValue
        });
        context.emit("drag", { value: newValue });
      }
    });
    this.hammer.on("panend", e => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        const newValue =
          (this.props.handle.axis == "x" ? dXIntegrate : dYIntegrate) +
          oldValue;
        context.emit("end", { value: newValue });
        this.setState({
          dragging: false
        });
        context = null;
      }
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public render() {
    const { handle } = this.props;
    const fX = (x: number) =>
      x * this.props.zoom.scale + this.props.zoom.centerX;
    const fY = (y: number) =>
      -y * this.props.zoom.scale + this.props.zoom.centerY;
    switch (handle.axis) {
      case "x": {
        return (
          <g
            className={classNames(
              "handle",
              "handle-line-x",
              ["active", this.state.dragging],
              ["visible", handle.visible || this.props.visible]
            )}
          >
            <g ref="line">
              <line
                className="element-line handle-ghost"
                x1={fX(handle.value)}
                x2={fX(handle.value)}
                y1={fY(handle.span[0])}
                y2={fY(handle.span[1])}
              />
              <line
                className="element-line handle-highlight"
                x1={fX(handle.value)}
                x2={fX(handle.value)}
                y1={fY(handle.span[0])}
                y2={fY(handle.span[1])}
              />
            </g>
            {this.state.dragging ? (
              <g>
                <line
                  className={`element-line handle-hint`}
                  x1={fX(this.state.newValue)}
                  x2={fX(this.state.newValue)}
                  y1={fY(handle.span[0])}
                  y2={fY(handle.span[1])}
                />
              </g>
            ) : null}
          </g>
        );
      }
      case "y": {
        return (
          <g
            className={classNames(
              "handle",
              "handle-line-y",
              ["active", this.state.dragging],
              ["visible", handle.visible || this.props.visible]
            )}
          >
            <g ref="line">
              <line
                className="element-line handle-ghost"
                y1={fY(handle.value)}
                y2={fY(handle.value)}
                x1={fX(handle.span[0])}
                x2={fX(handle.span[1])}
              />
              <line
                className="element-line handle-highlight"
                y1={fY(handle.value)}
                y2={fY(handle.value)}
                x1={fX(handle.span[0])}
                x2={fX(handle.span[1])}
              />
            </g>
            {this.state.dragging ? (
              <g>
                <line
                  className={`element-line handle-hint`}
                  y1={fY(this.state.newValue)}
                  y2={fY(this.state.newValue)}
                  x1={fX(handle.span[0])}
                  x2={fX(handle.span[1])}
                />
              </g>
            ) : null}
          </g>
        );
      }
    }
  }
}

export interface RelativeLineHandleViewProps extends HandleViewProps {
  handle: Prototypes.Handles.RelativeLine;
}

export interface RelativeLineHandleViewState {
  dragging: boolean;
  newValue: number;
}

export class RelativeLineHandleView extends React.Component<
  RelativeLineHandleViewProps,
  RelativeLineHandleViewState
> {
  public refs: {
    line: SVGLineElement;
  };
  public hammer: HammerManager;

  constructor(props: RelativeLineHandleViewProps) {
    super(props);
    this.state = {
      dragging: false,
      newValue: this.props.handle.value
    };
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.line);
    this.hammer.add(new Hammer.Pan({ threshold: 1 }));

    let context: HandlesDragContext = null;
    let oldValue: number;
    let dXIntegrate: number = 0;
    let dXLast: number = 0;
    let dYIntegrate: number = 0;
    let dYLast: number = 0;

    const sign = this.props.handle.sign;

    this.hammer.on("panstart", e => {
      context = new HandlesDragContext();
      oldValue = this.props.handle.value;
      dXLast = 0;
      dYLast = 0;
      dXIntegrate = 0;
      dYIntegrate = 0;
      this.setState({
        dragging: true,
        newValue: oldValue
      });
      if (this.props.onDragStart) {
        this.props.onDragStart(this.props.handle, context);
      }
    });
    this.hammer.on("pan", e => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        const newValue =
          (this.props.handle.axis == "x" ? dXIntegrate : dYIntegrate) * sign +
          oldValue;
        this.setState({
          newValue
        });
        context.emit("drag", { value: newValue });
      }
    });
    this.hammer.on("panend", e => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        const newValue =
          (this.props.handle.axis == "x" ? dXIntegrate : dYIntegrate) * sign +
          oldValue;
        context.emit("end", { value: newValue });
        this.setState({
          dragging: false
        });
        context = null;
      }
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public render() {
    const { handle } = this.props;
    const fX = (x: number) =>
      x * this.props.zoom.scale + this.props.zoom.centerX;
    const fY = (y: number) =>
      -y * this.props.zoom.scale + this.props.zoom.centerY;

    switch (handle.axis) {
      case "x": {
        return (
          <g
            className={classNames(
              "handle",
              "handle-line-x",
              ["active", this.state.dragging],
              ["visible", handle.visible || this.props.visible]
            )}
          >
            <g ref="line">
              <line
                className="element-line handle-ghost"
                x1={fX(handle.reference + handle.sign * handle.value)}
                x2={fX(handle.reference + handle.sign * handle.value)}
                y1={fY(handle.span[0])}
                y2={fY(handle.span[1])}
              />
              <line
                className="element-line handle-highlight"
                x1={fX(handle.reference + handle.sign * handle.value)}
                x2={fX(handle.reference + handle.sign * handle.value)}
                y1={fY(handle.span[0])}
                y2={fY(handle.span[1])}
              />
            </g>
            {this.state.dragging ? (
              <g>
                <line
                  className={`element-line handle-hint`}
                  x1={fX(handle.reference + handle.sign * this.state.newValue)}
                  x2={fX(handle.reference + handle.sign * this.state.newValue)}
                  y1={fY(handle.span[0])}
                  y2={fY(handle.span[1])}
                />
              </g>
            ) : null}
          </g>
        );
      }
      case "y": {
        return (
          <g
            className={classNames(
              "handle",
              "handle-line-y",
              ["active", this.state.dragging],
              ["visible", handle.visible || this.props.visible]
            )}
          >
            <g ref="line">
              <line
                className="element-line handle-ghost"
                y1={fY(handle.reference + handle.sign * handle.value)}
                y2={fY(handle.reference + handle.sign * handle.value)}
                x1={fX(handle.span[0])}
                x2={fX(handle.span[1])}
              />
              <line
                className="element-line handle-highlight"
                y1={fY(handle.reference + handle.sign * handle.value)}
                y2={fY(handle.reference + handle.sign * handle.value)}
                x1={fX(handle.span[0])}
                x2={fX(handle.span[1])}
              />
            </g>
            {this.state.dragging ? (
              <g>
                <line
                  className={`element-line handle-hint`}
                  y1={fY(handle.reference + handle.sign * this.state.newValue)}
                  y2={fY(handle.reference + handle.sign * this.state.newValue)}
                  x1={fX(handle.span[0])}
                  x2={fX(handle.span[1])}
                />
              </g>
            ) : null}
          </g>
        );
      }
    }
  }
}

export interface RelativeLineRatioHandleViewProps extends HandleViewProps {
  handle: Prototypes.Handles.GapRatio;
}

export interface RelativeLineRatioHandleViewState {
  dragging: boolean;
  newValue: number;
}

export class GapRatioHandleView extends React.Component<
  RelativeLineRatioHandleViewProps,
  RelativeLineRatioHandleViewState
> {
  public refs: {
    cOrigin: SVGCircleElement;
    line: SVGLineElement;
  };
  public hammer: HammerManager;

  constructor(props: RelativeLineRatioHandleViewProps) {
    super(props);
    this.state = {
      dragging: false,
      newValue: this.props.handle.value
    };
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.line);
    this.hammer.add(new Hammer.Pan({ threshold: 1 }));

    let context: HandlesDragContext = null;
    let oldValue: number;
    let xStart: number = 0;
    let yStart: number = 0;
    let dXIntegrate: number = 0;
    let dXLast: number = 0;
    let dYIntegrate: number = 0;
    let dYLast: number = 0;

    let scale = 1 / this.props.handle.scale;

    const getNewValue = () => {
      const cs = this.props.handle.coordinateSystem;
      if (cs == null || cs instanceof Graphics.CartesianCoordinates) {
        if (this.props.handle.axis == "x") {
          return oldValue + scale * dXIntegrate;
        }
        if (this.props.handle.axis == "y") {
          return oldValue + scale * dYIntegrate;
        }
      }
      if (cs instanceof Graphics.PolarCoordinates) {
        if (this.props.handle.axis == "x") {
          const getAngle = (x: number, y: number) => {
            return 90 - (Math.atan2(y, x) / Math.PI) * 180;
          };
          const angle0 = getAngle(xStart, yStart);
          let angle1 = getAngle(xStart + dXIntegrate, yStart + dYIntegrate);
          if (angle1 > angle0 + 180) {
            angle1 -= 360;
          }
          if (angle1 < angle0 - 180) {
            angle1 += 360;
          }
          return oldValue + scale * (angle1 - angle0);
        }
        if (this.props.handle.axis == "y") {
          const nX = xStart + dXIntegrate;
          const nY = yStart + dYIntegrate;
          const radius0 = Math.sqrt(xStart * xStart + yStart * yStart);
          const radius1 = Math.sqrt(nX * nX + nY * nY);
          return oldValue + scale * (radius1 - radius0);
        }
      }
      return oldValue;
    };

    this.hammer.on("panstart", e => {
      context = new HandlesDragContext();
      oldValue = this.props.handle.value;
      if (this.refs.cOrigin) {
        const bbox = this.refs.cOrigin.getBoundingClientRect();
        xStart = (e.center.x - e.deltaX - bbox.left) / this.props.zoom.scale;
        yStart = -(e.center.y - e.deltaY - bbox.top) / this.props.zoom.scale;
      } else {
        xStart = (e.center.x - e.deltaX) / this.props.zoom.scale;
        yStart = -(e.center.y - e.deltaY) / this.props.zoom.scale;
      }
      dXLast = e.deltaX;
      dYLast = e.deltaY;
      dXIntegrate = e.deltaX / this.props.zoom.scale;
      dYIntegrate = -e.deltaY / this.props.zoom.scale;
      scale = 1 / this.props.handle.scale;

      this.setState({
        dragging: true,
        newValue: oldValue
      });
      if (this.props.onDragStart) {
        this.props.onDragStart(this.props.handle, context);
      }
    });

    this.hammer.on("pan", e => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        let newValue = getNewValue();
        if (this.props.handle.range) {
          newValue = Math.min(
            this.props.handle.range[1],
            Math.max(newValue, this.props.handle.range[0])
          );
        } else {
          newValue = Math.min(1, Math.max(newValue, 0));
        }
        this.setState({
          newValue
        });
        context.emit("drag", { value: newValue });
      }
    });
    this.hammer.on("panend", e => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        let newValue = getNewValue();
        if (this.props.handle.range) {
          newValue = Math.min(
            this.props.handle.range[1],
            Math.max(newValue, this.props.handle.range[0])
          );
        } else {
          newValue = Math.min(1, Math.max(newValue, 0));
        }
        context.emit("end", { value: newValue });
        this.setState({
          dragging: false
        });
        context = null;
      }
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public render() {
    const handle = this.props.handle;
    if (
      handle.coordinateSystem == null ||
      handle.coordinateSystem instanceof Graphics.CartesianCoordinates
    ) {
      return this.renderCartesian();
    }
    if (handle.coordinateSystem instanceof Graphics.PolarCoordinates) {
      return this.renderPolar();
    }
    return null;
  }

  public renderPolar() {
    const { handle } = this.props;
    const polar = handle.coordinateSystem as Graphics.PolarCoordinates;
    const center = Geometry.applyZoom(this.props.zoom, {
      x: polar.origin.x,
      y: -polar.origin.y
    });
    switch (handle.axis) {
      case "x": {
        // angular axis
        const pathValue = Graphics.makePath();
        const pathRegion = Graphics.makePath();
        const angle = handle.reference + handle.scale * handle.value;
        const angleRef = handle.reference;
        const r1 = handle.span[0] * this.props.zoom.scale,
          r2 = handle.span[1] * this.props.zoom.scale;
        pathValue.polarLineTo(
          center.x,
          -center.y,
          -angle + 90,
          r1,
          -angle + 90,
          r2,
          true
        );
        pathRegion.polarLineTo(
          center.x,
          -center.y,
          -angle + 90,
          r1,
          -angle + 90,
          r2,
          true
        );
        pathRegion.polarLineTo(
          center.x,
          -center.y,
          -angle + 90,
          r2,
          -angleRef + 90,
          r2,
          false
        );
        pathRegion.polarLineTo(
          center.x,
          -center.y,
          -angleRef + 90,
          r2,
          -angleRef + 90,
          r1,
          false
        );
        pathRegion.polarLineTo(
          center.x,
          -center.y,
          -angleRef + 90,
          r1,
          -angle + 90,
          r1,
          false
        );
        pathRegion.closePath();
        const pathNew = Graphics.makePath();
        if (this.state.dragging) {
          const angleNew =
            handle.reference + handle.scale * this.state.newValue;
          pathNew.polarLineTo(
            center.x,
            -center.y,
            -angleNew + 90,
            r1,
            -angleNew + 90,
            r2,
            true
          );
        }
        return (
          <g
            className={classNames(
              "handle",
              "handle-line-angular",
              ["active", this.state.dragging],
              ["visible", handle.visible || this.props.visible]
            )}
          >
            <circle ref="cOrigin" cx={center.x} cy={center.y} r={0} />
            <g ref="line">
              <path
                d={renderSVGPath(pathRegion.path.cmds)}
                className="element-region handle-ghost"
              />
              <path
                d={renderSVGPath(pathValue.path.cmds)}
                className="element-line handle-ghost"
              />
              <path
                d={renderSVGPath(pathRegion.path.cmds)}
                className="element-region handle-highlight"
              />
              <path
                d={renderSVGPath(pathValue.path.cmds)}
                className="element-line handle-highlight"
              />
            </g>
            {this.state.dragging ? (
              <path
                d={renderSVGPath(pathNew.path.cmds)}
                className="element-line handle-hint"
              />
            ) : null}
          </g>
        );
      }
      case "y": {
        const pathValue = Graphics.makePath();
        const pathRegion = Graphics.makePath();
        const radius =
          (handle.reference + handle.scale * handle.value) *
          this.props.zoom.scale;
        const radiusRef = handle.reference * this.props.zoom.scale;
        const angle1 = handle.span[0],
          angle2 = handle.span[1];
        pathValue.polarLineTo(
          center.x,
          -center.y,
          -angle1 + 90,
          radius,
          -angle2 + 90,
          radius,
          true
        );
        pathRegion.polarLineTo(
          center.x,
          -center.y,
          -angle1 + 90,
          radius,
          -angle2 + 90,
          radius,
          true
        );
        pathRegion.polarLineTo(
          center.x,
          -center.y,
          -angle2 + 90,
          radius,
          -angle2 + 90,
          radiusRef,
          false
        );
        pathRegion.polarLineTo(
          center.x,
          -center.y,
          -angle2 + 90,
          radiusRef,
          -angle1 + 90,
          radiusRef,
          false
        );
        pathRegion.polarLineTo(
          center.x,
          -center.y,
          -angle1 + 90,
          radiusRef,
          -angle1 + 90,
          radius,
          false
        );
        pathRegion.closePath();
        const pathNew = Graphics.makePath();
        if (this.state.dragging) {
          const radiusNew =
            (handle.reference + handle.scale * this.state.newValue) *
            this.props.zoom.scale;
          pathNew.polarLineTo(
            center.x,
            -center.y,
            -angle1 + 90,
            radiusNew,
            -angle2 + 90,
            radiusNew,
            true
          );
        }
        return (
          <g
            className={classNames(
              "handle",
              "handle-line-radial",
              ["active", this.state.dragging],
              ["visible", handle.visible || this.props.visible]
            )}
          >
            <circle ref="cOrigin" cx={center.x} cy={center.y} r={0} />
            <g ref="line">
              <path
                d={renderSVGPath(pathRegion.path.cmds)}
                className="element-region handle-ghost"
              />
              <path
                d={renderSVGPath(pathValue.path.cmds)}
                className="element-line handle-ghost"
              />
              <path
                d={renderSVGPath(pathRegion.path.cmds)}
                className="element-region handle-highlight"
              />
              <path
                d={renderSVGPath(pathValue.path.cmds)}
                className="element-line handle-highlight"
              />
            </g>
            {this.state.dragging ? (
              <path
                d={renderSVGPath(pathNew.path.cmds)}
                className="element-line handle-hint"
              />
            ) : null}
          </g>
        );
      }
    }
  }

  public renderCartesian() {
    const { handle } = this.props;
    const fX = (x: number) =>
      x * this.props.zoom.scale + this.props.zoom.centerX;
    const fY = (y: number) =>
      -y * this.props.zoom.scale + this.props.zoom.centerY;

    switch (handle.axis) {
      case "x": {
        const fxRef = fX(handle.reference);
        const fxVal = fX(handle.reference + handle.scale * handle.value);
        const fy1 = fY(handle.span[0]);
        const fy2 = fY(handle.span[1]);
        return (
          <g
            className={classNames(
              "handle",
              "handle-line-x",
              ["active", this.state.dragging],
              ["visible", handle.visible || this.props.visible]
            )}
          >
            <g ref="line">
              <line
                className="element-line handle-ghost"
                x1={fxVal}
                x2={fxVal}
                y1={fy1}
                y2={fy2}
              />
              <rect
                className="element-region handle-ghost"
                x={Math.min(fxRef, fxVal)}
                width={Math.abs(fxRef - fxVal)}
                y={Math.min(fy1, fy2)}
                height={Math.abs(fy2 - fy1)}
              />
              <line
                className="element-line handle-highlight"
                x1={fxVal}
                x2={fxVal}
                y1={fy1}
                y2={fy2}
              />
              <rect
                className="element-region handle-highlight"
                x={Math.min(fxRef, fxVal)}
                width={Math.abs(fxRef - fxVal)}
                y={Math.min(fy1, fy2)}
                height={Math.abs(fy2 - fy1)}
              />
            </g>
            {this.state.dragging ? (
              <g>
                <line
                  className={`element-line handle-hint`}
                  x1={fX(handle.reference + handle.scale * this.state.newValue)}
                  x2={fX(handle.reference + handle.scale * this.state.newValue)}
                  y1={fY(handle.span[0])}
                  y2={fY(handle.span[1])}
                />
              </g>
            ) : null}
          </g>
        );
      }
      case "y": {
        const fyRef = fY(handle.reference);
        const fyVal = fY(handle.reference + handle.scale * handle.value);
        const fx1 = fX(handle.span[0]);
        const fx2 = fX(handle.span[1]);
        return (
          <g
            className={classNames(
              "handle",
              "handle-line-y",
              ["active", this.state.dragging],
              ["visible", handle.visible || this.props.visible]
            )}
          >
            <g ref="line">
              <line
                className="element-line handle-ghost"
                y1={fyVal}
                y2={fyVal}
                x1={fx1}
                x2={fx2}
              />
              <rect
                className="element-region handle-ghost"
                y={Math.min(fyRef, fyVal)}
                height={Math.abs(fyRef - fyVal)}
                x={Math.min(fx1, fx2)}
                width={Math.abs(fx2 - fx1)}
              />
              <line
                className="element-line handle-highlight"
                y1={fyVal}
                y2={fyVal}
                x1={fx1}
                x2={fx2}
              />
              <rect
                className="element-region handle-highlight"
                y={Math.min(fyRef, fyVal)}
                height={Math.abs(fyRef - fyVal)}
                x={Math.min(fx1, fx2)}
                width={Math.abs(fx2 - fx1)}
              />
            </g>
            {this.state.dragging ? (
              <g>
                <line
                  className={`element-line handle-hint`}
                  y1={fY(handle.reference + handle.scale * this.state.newValue)}
                  y2={fY(handle.reference + handle.scale * this.state.newValue)}
                  x1={fx1}
                  x2={fx2}
                />
              </g>
            ) : null}
          </g>
        );
      }
    }
  }
}

export interface MarginHandleViewProps extends HandleViewProps {
  handle: Prototypes.Handles.Margin;
}

export interface MarginHandleViewState {
  dragging: boolean;
  newValue: number;
}

export class MarginHandleView extends React.Component<
  MarginHandleViewProps,
  MarginHandleViewState
> {
  public refs: {
    margin: SVGGElement;
  };
  public hammer: HammerManager;

  constructor(props: MarginHandleViewProps) {
    super(props);
    this.state = {
      dragging: false,
      newValue: this.props.handle.value
    };
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.margin);
    this.hammer.add(new Hammer.Pan({ threshold: 1 }));

    let context: HandlesDragContext = null;
    let oldValue: number;
    let sign: number;
    let total: number;
    let dXIntegrate: number = 0;
    let dXLast: number = 0;
    let dYIntegrate: number = 0;
    let dYLast: number = 0;

    this.hammer.on("panstart", e => {
      context = new HandlesDragContext();
      oldValue = this.props.handle.value;
      sign = this.props.handle.sign;
      if (this.props.handle.total != null) {
        total = this.props.handle.total;
      } else {
        total = 1;
      }
      dXLast = 0;
      dYLast = 0;
      dXIntegrate = 0;
      dYIntegrate = 0;
      this.setState({
        dragging: true,
        newValue: oldValue
      });
      if (this.props.onDragStart) {
        this.props.onDragStart(this.props.handle, context);
      }
    });
    this.hammer.on("pan", e => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        let newValue =
          ((this.props.handle.axis == "x" ? dXIntegrate : dYIntegrate) * sign) /
            total +
          oldValue;
        if (this.props.handle.range) {
          newValue = Math.min(
            this.props.handle.range[1],
            Math.max(newValue, this.props.handle.range[0])
          );
        }
        this.setState({
          newValue
        });
        context.emit("drag", { value: newValue });
      }
    });
    this.hammer.on("panend", e => {
      if (context) {
        dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
        dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
        dXLast = e.deltaX;
        dYLast = e.deltaY;
        let newValue =
          ((this.props.handle.axis == "x" ? dXIntegrate : dYIntegrate) * sign) /
            total +
          oldValue;
        if (this.props.handle.range) {
          newValue = Math.min(
            this.props.handle.range[1],
            Math.max(newValue, this.props.handle.range[0])
          );
        }
        context.emit("end", { value: newValue });
        this.setState({
          dragging: false
        });
        context = null;
      }
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public render() {
    const { handle } = this.props;
    const fX = (x: number) =>
      x * this.props.zoom.scale + this.props.zoom.centerX;
    const fY = (y: number) =>
      -y * this.props.zoom.scale + this.props.zoom.centerY;
    let x: number, y: number;
    let nx: number, ny: number;
    let shape: string;
    const scale = this.props.handle.total || 1;
    switch (handle.axis) {
      case "x":
        {
          x = fX(handle.x + handle.value * handle.sign * scale);
          y = fY(handle.y);
          nx = fX(handle.x + this.state.newValue * handle.sign * scale);
          ny = fY(handle.y);
          shape = "M0,0l5,12.72l-10,0Z";
        }
        break;
      case "y":
        {
          x = fX(handle.x);
          y = fY(handle.y + handle.value * handle.sign * scale);
          nx = fX(handle.x);
          ny = fY(handle.y + this.state.newValue * handle.sign * scale);
          shape = "M0,0l-12.72,5l0,-10Z";
        }
        break;
    }
    return (
      <g
        ref="margin"
        className={classNames(
          "handle",
          "handle-gap-" + handle.axis,
          ["active", this.state.dragging],
          ["visible", handle.visible || this.props.visible]
        )}
      >
        <path
          className="element-shape handle-ghost"
          transform={`translate(${x.toFixed(6)},${y.toFixed(6)})`}
          d={shape}
        />
        <path
          className="element-shape handle-highlight"
          transform={`translate(${x.toFixed(6)},${y.toFixed(6)})`}
          d={shape}
        />
        {this.state.dragging ? (
          <path
            className="element-shape handle-hint"
            transform={`translate(${nx.toFixed(6)},${ny.toFixed(6)})`}
            d={shape}
          />
        ) : null}
      </g>
    );
  }
}

export interface AngleHandleViewProps extends HandleViewProps {
  handle: Prototypes.Handles.Angle;
}

export interface AngleHandleViewState {
  dragging: boolean;
  newValue: number;
}

export class AngleHandleView extends React.Component<
  AngleHandleViewProps,
  AngleHandleViewState
> {
  public refs: {
    margin: SVGGElement;
    centerCircle: SVGCircleElement;
  };
  public hammer: HammerManager;

  constructor(props: AngleHandleViewProps) {
    super(props);
    this.state = {
      dragging: false,
      newValue: this.props.handle.value
    };
  }

  public clipAngle(v: number) {
    v = Math.round(v / 15) * 15;
    const min = this.props.handle.clipAngles[0];
    const max = this.props.handle.clipAngles[1];
    if (min != null) {
      while (v >= min) {
        v -= 360;
      }
      while (v <= min) {
        v += 360;
      }
    }
    if (max != null) {
      while (v <= max) {
        v += 360;
      }
      while (v >= max) {
        v -= 360;
      }
    }
    return v;
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.margin);
    this.hammer.add(new Hammer.Pan({ threshold: 1 }));

    let context: HandlesDragContext = null;
    let oldValue = 0;

    this.hammer.on("panstart", e => {
      context = new HandlesDragContext();
      oldValue = this.props.handle.value;
      this.setState({
        dragging: true,
        newValue: oldValue
      });
      if (this.props.onDragStart) {
        this.props.onDragStart(this.props.handle, context);
      }
    });
    this.hammer.on("pan", e => {
      if (context) {
        const cc = this.refs.centerCircle.getBoundingClientRect();
        const px = e.center.x - (cc.left + cc.width / 2);
        const py = e.center.y - (cc.top + cc.height / 2);
        const newValue = this.clipAngle(
          (Math.atan2(-px, py) / Math.PI) * 180 + 180
        );
        this.setState({
          newValue
        });
        context.emit("drag", { value: newValue });
      }
    });
    this.hammer.on("panend", e => {
      if (context) {
        const cc = this.refs.centerCircle.getBoundingClientRect();
        const px = e.center.x - (cc.left + cc.width / 2);
        const py = e.center.y - (cc.top + cc.height / 2);
        const newValue = this.clipAngle(
          (Math.atan2(-px, py) / Math.PI) * 180 + 180
        );
        // if (this.props.handle.range) {
        //     newValue = Math.min(this.props.handle.range[1], Math.max(newValue, this.props.handle.range[0]));
        // }
        context.emit("end", { value: newValue });
        this.setState({
          dragging: false
        });
        context = null;
      }
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public static shapeCircle = (r: number) =>
    `M -${r} 0 A ${r} ${r} 0 1 0 ${r} 0 A ${r} ${r} 0 1 0 ${-r} 0 Z`;
  public static shapeRight = (r: number) =>
    `M 0 ${-r} L ${-1.5 * r} 0 L 0 ${r} Z`;
  public static shapeLeft = (r: number) =>
    `M 0 ${-r} L ${1.5 * r} 0 L 0 ${r} Z`;

  public render() {
    const { handle } = this.props;
    const fX = (x: number) =>
      x * this.props.zoom.scale + this.props.zoom.centerX;
    const fY = (y: number) =>
      -y * this.props.zoom.scale + this.props.zoom.centerY;
    const cx = fX(handle.cx);
    const cy = fY(handle.cy);
    const radius = handle.radius * this.props.zoom.scale + 10;
    let shapeF = AngleHandleView.shapeCircle;
    if (handle.icon == "<") {
      shapeF = AngleHandleView.shapeLeft;
    }
    if (handle.icon == ">") {
      shapeF = AngleHandleView.shapeRight;
    }
    return (
      <g
        ref="margin"
        className={classNames(
          "handle",
          "handle-angle",
          ["active", this.state.dragging],
          ["visible", handle.visible || this.props.visible]
        )}
      >
        <g transform={`translate(${cx},${cy}) rotate(${180 + handle.value})`}>
          <circle ref="centerCircle" cx={0} cy={0} r={0} />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={radius}
            className="element-line handle-ghost"
          />
          <path
            d={shapeF(9)}
            transform={`translate(0,${radius})`}
            className="element-shape handle-ghost"
          />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={radius}
            className="element-line handle-highlight"
          />
          <path
            d={shapeF(5)}
            transform={`translate(0,${radius})`}
            className="element-shape handle-highlight"
          />
        </g>
        {this.state.dragging ? (
          <g
            transform={`translate(${cx},${cy}) rotate(${180 +
              this.state.newValue})`}
          >
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={radius}
              className="element-line handle-hint"
            />
            <path
              d={shapeF(5)}
              transform={`translate(0,${radius})`}
              className="element-shape handle-hint"
            />
          </g>
        ) : null}
      </g>
    );

    // let x: number, y: number;
    // let nx: number, ny: number;
    // let shape: string;
    // let scale = this.props.handle.total || 1;
    // switch (handle.axis) {
    //     case "x": {
    //         x = fX(handle.x + handle.value * handle.sign * scale);
    //         y = fY(handle.y);
    //         nx = fX(handle.x + this.state.newValue * handle.sign * scale);
    //         ny = fY(handle.y);
    //         shape = "M0,0l5,12.72l-10,0Z";
    //     } break;
    //     case "y": {
    //         x = fX(handle.x);
    //         y = fY(handle.y + handle.value * handle.sign * scale);
    //         nx = fX(handle.x);
    //         ny = fY(handle.y + this.state.newValue * handle.sign * scale);
    //         shape = "M0,0l-12.72,5l0,-10Z";
    //     } break;
    // }
    // return (
    //     <g ref="margin" className={classNames("handle", "handle-gap-" + handle.axis, ["active", this.state.dragging], ["visible", handle.visible || this.props.visible])}>
    //         <path className="element-shape handle-ghost"
    //             transform={`translate(${x.toFixed(6)},${y.toFixed(6)})`}
    //             d={shape}
    //         />
    //         <path className="element-shape handle-highlight"
    //             transform={`translate(${x.toFixed(6)},${y.toFixed(6)})`}
    //             d={shape}
    //         />
    //         {this.state.dragging ? (
    //             <path className="element-shape handle-hint"
    //                 transform={`translate(${nx.toFixed(6)},${ny.toFixed(6)})`}
    //                 d={shape}
    //             />
    //         ) : null}
    //     </g>
    // );
  }
}

export interface DistanceRatioHandleViewProps extends HandleViewProps {
  handle: Prototypes.Handles.DistanceRatio;
}

export interface DistanceRatioHandleViewState {
  dragging: boolean;
  newValue: number;
}

export class DistanceRatioHandleView extends React.Component<
  DistanceRatioHandleViewProps,
  DistanceRatioHandleViewState
> {
  public refs: {
    margin: SVGGElement;
    centerCircle: SVGCircleElement;
  };
  public hammer: HammerManager;

  constructor(props: DistanceRatioHandleViewProps) {
    super(props);
    this.state = {
      dragging: false,
      newValue: this.props.handle.value
    };
  }

  public clip(v: number) {
    const min = this.props.handle.clipRange[0];
    const max = this.props.handle.clipRange[1];
    if (v < min) {
      v = min;
    }
    if (v > max) {
      v = max;
    }
    if (v < 0.05) {
      v = 0;
    }
    return v;
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.refs.margin);
    this.hammer.add(new Hammer.Pan({ threshold: 1 }));

    let context: HandlesDragContext = null;
    let oldValue = 0;

    this.hammer.on("panstart", e => {
      context = new HandlesDragContext();
      oldValue = this.props.handle.value;
      this.setState({
        dragging: true,
        newValue: oldValue
      });
      if (this.props.onDragStart) {
        this.props.onDragStart(this.props.handle, context);
      }
    });
    this.hammer.on("pan", e => {
      if (context) {
        const cc = this.refs.centerCircle.getBoundingClientRect();
        const px = e.center.x - (cc.left + cc.width / 2);
        const py = e.center.y - (cc.top + cc.height / 2);
        let d = Math.sqrt(px * px + py * py) / this.props.zoom.scale;
        d =
          (d - this.props.handle.startDistance) /
          (this.props.handle.endDistance - this.props.handle.startDistance);
        d = this.clip(d);
        const newValue = d;
        this.setState({
          newValue
        });
        context.emit("drag", { value: newValue });
      }
    });
    this.hammer.on("panend", e => {
      if (context) {
        const cc = this.refs.centerCircle.getBoundingClientRect();
        const px = e.center.x - (cc.left + cc.width / 2);
        const py = e.center.y - (cc.top + cc.height / 2);
        let d = Math.sqrt(px * px + py * py) / this.props.zoom.scale;
        d =
          (d - this.props.handle.startDistance) /
          (this.props.handle.endDistance - this.props.handle.startDistance);
        d = this.clip(d);
        const newValue = d;
        // if (this.props.handle.range) {
        //     newValue = Math.min(this.props.handle.range[1], Math.max(newValue, this.props.handle.range[0]));
        // }
        context.emit("end", { value: newValue });
        this.setState({
          dragging: false
        });
        context = null;
      }
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public render() {
    const { handle } = this.props;
    const fX = (x: number) =>
      x * this.props.zoom.scale + this.props.zoom.centerX;
    const fY = (y: number) =>
      -y * this.props.zoom.scale + this.props.zoom.centerY;
    const cx = fX(handle.cx);
    const cy = fY(handle.cy);
    const d1 = handle.startDistance * this.props.zoom.scale;
    const d2 = handle.endDistance * this.props.zoom.scale;
    const fRadius = (x: number) => x * (d2 - d1) + d1;
    const makePath = (value: number) => {
      const path = Graphics.makePath();
      path.polarLineTo(
        0,
        0,
        90 - handle.startAngle,
        fRadius(value),
        90 - handle.endAngle,
        fRadius(value),
        true
      );
      return renderSVGPath(path.path.cmds);
    };
    const px = (value: number) => {
      const alpha = ((90 - handle.startAngle) / 180) * Math.PI;
      return Math.cos(alpha) * fRadius(value);
    };
    const py = (value: number) => {
      const alpha = ((90 - handle.startAngle) / 180) * Math.PI;
      return -Math.sin(alpha) * fRadius(value);
    };
    return (
      <g
        ref="margin"
        className={classNames(
          "handle",
          "handle-distance",
          ["active", this.state.dragging],
          ["visible", handle.visible || this.props.visible]
        )}
      >
        <g transform={`translate(${cx},${cy})`}>
          <circle ref="centerCircle" cx={0} cy={0} r={0} />
          <path
            d={makePath(handle.value)}
            className="element-line handle-ghost"
          />
          <path
            d={makePath(handle.value)}
            className="element-line handle-highlight"
          />
          {handle.value == 0 ? (
            <circle
              cx={px(handle.value)}
              cy={py(handle.value)}
              r={3}
              className="element-shape handle-highlight"
            />
          ) : null}
        </g>
        {this.state.dragging ? (
          <g transform={`translate(${cx},${cy})`}>
            <path
              d={makePath(this.state.newValue)}
              className="element-line handle-hint"
            />
            {this.state.newValue == 0 ? (
              <circle
                cx={px(this.state.newValue)}
                cy={py(this.state.newValue)}
                r={3}
                className="element-shape handle-hint"
              />
            ) : null}
          </g>
        ) : null}
      </g>
    );
  }
}

export interface TextAlignmentHandleViewProps extends HandleViewProps {
  handle: Prototypes.Handles.TextAlignment;
}

export interface TextAlignmentHandleViewState {
  dragging: boolean;
  newAlignment: Specification.Types.TextAlignment;
  newRotation: number;
}

export class TextAlignmentHandleView extends React.Component<
  TextAlignmentHandleViewProps,
  TextAlignmentHandleViewState
> {
  private container: SVGGElement;
  private anchorCircle: SVGCircleElement;
  private rotationCircle: SVGCircleElement;
  private hammer: HammerManager;

  constructor(props: TextAlignmentHandleViewProps) {
    super(props);
    this.handleClick = this.handleClick.bind(this);

    this.state = {
      dragging: false,
      newAlignment: props.handle.alignment,
      newRotation: props.handle.rotation
    };
  }

  public getRelativePoint(px: number, py: number) {
    const anchorBounds = this.anchorCircle.getBoundingClientRect();
    const x = px - (anchorBounds.left + anchorBounds.width / 2);
    const y = py - (anchorBounds.top + anchorBounds.height / 2);
    return { x: x / this.props.zoom.scale, y: -y / this.props.zoom.scale };
  }

  public componentDidMount() {
    this.hammer = new Hammer(this.container);
    this.hammer.add(new Hammer.Pan({ threshold: 1 }));
    this.hammer.add(new Hammer.Tap());

    let mode: "rotation" | "alignment" = null;
    let startX: number = 0;
    let startY: number = 0;
    let sumDeltaX: number = 0,
      dXLast = 0;
    let sumDeltaY: number = 0,
      dYLast = 0;
    let p0: Point;
    let previousAlignment: Specification.Types.TextAlignment;
    let previousRotation: number;

    let context: HandlesDragContext = null;

    const newStateFromMoveAndRotate = (
      dx: number,
      dy: number,
      newRotation: number,
      snapping: boolean
    ): [Specification.Types.TextAlignment, number] => {
      const rect = this.getRectFromAlignment(
        previousAlignment,
        previousRotation
      );
      const acx = rect.cx - this.props.handle.anchorX;
      const acy = rect.cy - this.props.handle.anchorY;

      const newAlignment: Specification.Types.TextAlignment = {
        x: previousAlignment.x,
        y: previousAlignment.y,
        xMargin: previousAlignment.xMargin,
        yMargin: previousAlignment.yMargin
      };

      const cos = Math.cos((newRotation / 180) * Math.PI);
      const sin = Math.sin((newRotation / 180) * Math.PI);

      const pdx = dx * cos + dy * sin;
      const pdy = -dx * sin + dy * cos;
      const pcx = acx * cos + acy * sin;
      const pcy = -acx * sin + acy * cos;

      const npcx = pcx + pdx;
      const npcy = pcy + pdy;
      if (snapping && Math.abs(npcy) < 5 / this.props.zoom.scale) {
        newAlignment.y = "middle";
      } else if (npcy < 0) {
        newAlignment.y = "top";
        newAlignment.yMargin = -npcy - this.props.handle.textHeight / 2;
        if (Math.abs(newAlignment.yMargin) < 5 / this.props.zoom.scale) {
          newAlignment.yMargin = 0;
        }
      } else {
        newAlignment.y = "bottom";
        newAlignment.yMargin = npcy - this.props.handle.textHeight / 2;
        if (Math.abs(newAlignment.yMargin) < 5 / this.props.zoom.scale) {
          newAlignment.yMargin = 0;
        }
      }
      if (snapping && Math.abs(npcx) < 5 / this.props.zoom.scale) {
        newAlignment.x = "middle";
      } else if (npcx < 0) {
        newAlignment.x = "right";
        newAlignment.xMargin = -npcx - this.props.handle.textWidth / 2;
        if (Math.abs(newAlignment.xMargin) < 5 / this.props.zoom.scale) {
          newAlignment.xMargin = 0;
        }
      } else {
        newAlignment.x = "left";
        newAlignment.xMargin = npcx - this.props.handle.textWidth / 2;
        if (Math.abs(newAlignment.xMargin) < 5 / this.props.zoom.scale) {
          newAlignment.xMargin = 0;
        }
      }
      return [newAlignment, newRotation];
    };

    const handleRotation = (p1: Point, commit: boolean = false) => {
      const rect = this.getRectFromAlignment(
        previousAlignment,
        previousRotation
      );
      const ox = rect.cx - this.props.handle.anchorX;
      const oy = rect.cy - this.props.handle.anchorY;
      let newRotation =
        (Math.atan2(p1.y - oy, p1.x - ox) / Math.PI) * 180 + 180;
      newRotation = Math.round(newRotation / 15) * 15;

      const newAlignment = newStateFromMoveAndRotate(
        0,
        0,
        newRotation,
        false
      )[0];

      if (commit) {
        this.setState({
          dragging: false
        });
        context.emit("end", { alignment: newAlignment, rotation: newRotation });
      } else {
        this.setState({
          newAlignment,
          newRotation
        });
        context.emit("drag", {
          alignment: newAlignment,
          rotation: newRotation
        });
      }
    };

    const handleAlignment = (p1: Point, commit: boolean = false) => {
      const [newAlignment, newRotation] = newStateFromMoveAndRotate(
        p1.x - p0.x,
        p1.y - p0.y,
        previousRotation,
        true
      );
      if (commit) {
        this.setState({
          dragging: false
        });
        context.emit("end", {
          alignment: newAlignment,
          rotation: previousRotation
        });
      } else {
        this.setState({
          newAlignment
        });
        context.emit("drag", {
          alignment: newAlignment,
          rotation: previousRotation
        });
      }
    };

    this.hammer.on("panstart", e => {
      const cx = e.center.x - e.deltaX;
      const cy = e.center.y - e.deltaY;
      startX = cx;
      startY = cy;
      dXLast = e.deltaX;
      dYLast = e.deltaY;
      sumDeltaX = e.deltaX;
      sumDeltaY = e.deltaY;
      const el = document.elementFromPoint(cx, cy);
      context = new HandlesDragContext();
      this.props.onDragStart(this.props.handle, context);
      p0 = this.getRelativePoint(cx, cy);
      const p1 = this.getRelativePoint(cx + e.deltaX, cy + e.deltaY);
      previousAlignment = this.props.handle.alignment;
      previousRotation = this.props.handle.rotation;
      if (el == this.rotationCircle) {
        mode = "rotation";
        handleRotation(p1);
      } else {
        mode = "alignment";
        handleAlignment(p1);
      }
      this.setState({
        dragging: true,
        newAlignment: previousAlignment,
        newRotation: previousRotation
      });
    });
    this.hammer.on("pan", e => {
      sumDeltaX += e.deltaX - dXLast;
      sumDeltaY += e.deltaY - dYLast;
      dXLast = e.deltaX;
      dYLast = e.deltaY;
      const cx = startX + sumDeltaX;
      const cy = startY + sumDeltaY;
      // cx = e.center.x;
      // cy = e.center.y;
      const p1 = this.getRelativePoint(cx, cy);
      if (mode == "rotation") {
        handleRotation(p1);
      } else {
        handleAlignment(p1);
      }
    });
    this.hammer.on("panend", e => {
      sumDeltaX += e.deltaX - dXLast;
      sumDeltaY += e.deltaY - dYLast;
      dXLast = e.deltaX;
      dYLast = e.deltaY;
      const cx = startX + sumDeltaX;
      const cy = startY + sumDeltaY;
      // cx = e.center.x;
      // cy = e.center.y;
      const p1 = this.getRelativePoint(cx, cy);
      if (mode == "rotation") {
        handleRotation(p1, true);
      } else {
        handleAlignment(p1, true);
      }
      context = null;
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  public handleClick() {
    if (this.props.handle.text == null) {
      return;
    }
    globals.popupController.popupAt(
      context => {
        return (
          <PopupView context={context}>
            <div className="handle-text-view-popup">
              <EditableTextView
                text={this.props.handle.text}
                autofocus={true}
                onEdit={newText => {
                  const dragContext = new HandlesDragContext();
                  this.props.onDragStart(this.props.handle, dragContext);
                  dragContext.emit("end", { text: newText });
                  context.close();
                }}
              />
            </div>
          </PopupView>
        );
      },
      {
        anchor: this.container
      }
    );
  }

  public getRectFromAlignment(
    alignment: Specification.Types.TextAlignment,
    rotation: number
  ) {
    const cos = Math.cos((rotation / 180) * Math.PI);
    const sin = Math.sin((rotation / 180) * Math.PI);
    let dx = 0,
      dy = 0;
    if (alignment.x == "left") {
      dx = this.props.handle.textWidth / 2 + alignment.xMargin;
    }
    if (alignment.x == "right") {
      dx = -this.props.handle.textWidth / 2 - alignment.xMargin;
    }
    const fx =
      dx - this.props.handle.textWidth / 2 - 10 / this.props.zoom.scale;
    if (alignment.y == "top") {
      dy = -this.props.handle.textHeight / 2 - alignment.yMargin;
    }
    if (alignment.y == "bottom") {
      dy = +this.props.handle.textHeight / 2 + alignment.yMargin;
    }
    return {
      cx: this.props.handle.anchorX + dx * cos - dy * sin,
      cy: this.props.handle.anchorY + dx * sin + dy * cos,
      fx: this.props.handle.anchorX + fx * cos - dy * sin,
      fy: this.props.handle.anchorY + fx * sin + dy * cos,
      width: this.props.handle.textWidth,
      height: this.props.handle.textHeight,
      rotation
    };
  }

  public renderDragging() {
    if (this.state.dragging) {
      const zoom = this.props.zoom;
      const rect = this.getRectFromAlignment(
        this.state.newAlignment,
        this.state.newRotation
      );
      const p = Geometry.applyZoom(zoom, { x: rect.cx, y: -rect.cy });
      const fp = Geometry.applyZoom(zoom, { x: rect.fx, y: -rect.fy });
      const margin = 0;
      return (
        <g>
          <rect
            className="element-shape handle-hint"
            transform={`translate(${p.x.toFixed(6)},${p.y.toFixed(
              6
            )})rotate(${-rect.rotation})`}
            x={(-rect.width / 2) * zoom.scale - margin}
            y={(-rect.height / 2) * zoom.scale - margin}
            width={rect.width * zoom.scale + margin * 2}
            height={rect.height * zoom.scale + margin * 2}
          />
        </g>
      );
    } else {
      return null;
    }
  }

  public render() {
    const handle = this.props.handle;
    const zoom = this.props.zoom;
    const margin = 0;
    const rect = this.getRectFromAlignment(handle.alignment, handle.rotation);
    const p = Geometry.applyZoom(zoom, { x: rect.cx, y: -rect.cy });
    const anchor = Geometry.applyZoom(zoom, {
      x: handle.anchorX,
      y: -handle.anchorY
    });
    const fp = Geometry.applyZoom(zoom, { x: rect.fx, y: -rect.fy });
    return (
      <g
        className={classNames(
          "handle",
          "handle-text-input",
          ["active", this.state.dragging],
          ["visible", handle.visible || this.props.visible]
        )}
        onClick={this.handleClick}
        ref={e => (this.container = e)}
      >
        <circle
          className="element-shape handle-ghost"
          cx={anchor.x}
          cy={anchor.y}
          r={0}
          ref={e => (this.anchorCircle = e)}
        />
        <g transform={`translate(${fp.x - 16},${fp.y - 16})`}>
          <path
            className="element-solid handle-highlight"
            d="M22.05664,15a.99974.99974,0,0,0-1,1,5.05689,5.05689,0,1,1-6.07794-4.95319v2.38654l6.04468-3.49042L14.9787,6.45245V9.02539A7.05306,7.05306,0,1,0,23.05664,16,.99973.99973,0,0,0,22.05664,15Z"
          />
        </g>
        <line
          className="element-line handle-dashed-highlight"
          x1={anchor.x}
          y1={anchor.y}
          x2={p.x}
          y2={p.y}
        />
        <rect
          className="element-shape handle-ghost element-text-rect"
          transform={`translate(${p.x.toFixed(6)},${p.y.toFixed(
            6
          )})rotate(${-rect.rotation})`}
          x={(-rect.width / 2) * zoom.scale - margin}
          y={(-rect.height / 2) * zoom.scale - margin}
          width={rect.width * zoom.scale + margin * 2}
          height={rect.height * zoom.scale + margin * 2}
        />
        <circle
          className="element-shape handle-ghost element-rotation"
          ref={e => (this.rotationCircle = e)}
          cx={fp.x}
          cy={fp.y}
          r={8}
        />
        {this.renderDragging()}
      </g>
    );
  }
}
