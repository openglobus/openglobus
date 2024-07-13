import {Control, IControlParams} from "./Control";
import {Dialog} from '../ui/Dialog';
import {Slider} from "../ui/Slider";
import {Sun} from "./Sun";
import {ToggleButton} from "../ui/ToggleButton";
import {View} from '../ui/View';
import {Atmosphere} from "./Atmosphere";
import {Color} from "../ui/Color";
import {AtmosphereParameters} from "../shaders/atmos";

interface IAtmosphereConfigParams extends IControlParams {

}

const TEMPLATE =
    `<div class="og-atmosphere og-options-container">
         
         <div class="og-option og-atmosphere-maxOpacity"></div> 
         <div class="og-option og-atmosphere-minOpacity"></div>
         
       <div class="og-emptyline-2"></div>
         
         <div class="og-option og-atmosphere-rayleight"></div>
         <div class="og-option og-atmosphere-mie"></div>
         
       <div class="og-emptyline-2"></div>
                  
         <div class="og-option og-atmosphere-height"></div> 
         <div class="og-option og-atmosphere-bottomRadius"></div>
         
       <div class="og-emptyline-2"></div>
         
         <div class="og-option og-atmosphere-mieScatteringCoefficient"></div>  
         <div class="og-option og-atmosphere-mieExtinctionCoefficient"></div>
         
       <div class="og-emptyline-2"></div>
         
         <div class="og-option og-atmosphere-rayleighScatteringCoefficientA"></div>    
         <div class="og-option og-atmosphere-rayleighScatteringCoefficientB"></div>    
         <div class="og-option og-atmosphere-rayleighScatteringCoefficientC"></div>
         
       <div class="og-emptyline-2"></div>
         
         <div class="og-option og-atmosphere-ozoneAbsorptionCoefficientA"></div>    
         <div class="og-option og-atmosphere-ozoneAbsorptionCoefficientB"></div>    
         <div class="og-option og-atmosphere-ozoneAbsorptionCoefficientC"></div>
         
       <div class="og-emptyline-2"></div>
         
         <div class="og-option og-atmosphere-ozoneDensityHeight"></div>    
         <div class="og-option og-atmosphere-ozoneDensityWide"></div>    
         
       <div class="og-emptyline-2"></div>
         
         <div class="og-option og-atmosphere-sunAngularRadius"></div> 
         <div class="og-option og-atmosphere-sunIntensity"></div> 
         <div class="og-option og-atmosphere-earthAlbedo"></div>
       
    </div>`;

const ICON_BUTTON_SVG = `<?xml version="1.0" encoding="utf-8"?><!-- Uploaded to: SVG Repo, www.svgrepo.com, Generator: SVG Repo Mixer Tools -->
<svg width="800px" height="800px" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path fill="#000000" d="M135.688 18.5c-6.798 74.842-23.842 85.39-107.907 59.656 84.85 52.022 73.57 64.954-6.843 96.938 87.743-10.27 103.29 4.89 70.75 87.594 17.805-27.56 32.5-44.498 46.282-54.47-11.813 28.26-18.345 59.274-18.345 91.813 0 84.184 43.71 157.96 109.656 200.376-41.624-43.834-67.686-102.7-67.686-167.875 0-134.923 109.45-244.405 244.375-244.405 30.92 0 60.76 5.762 88 16.25-38.584-26.87-85.517-42.625-136.064-42.625-55.257 0-106.14 18.802-146.562 50.375 4.627-18.783 17.39-38.073 41.03-60.906C190.18 90.942 153.53 95.634 135.69 18.5zm10.03 77.188c5.67.002 11.428 1.247 16.876 3.874 14.506 6.998 22.72 21.81 22 36.938-10.26 10.87-19.507 22.696-27.594 35.344-9.035 2.753-19.075 2.27-28.25-2.156-19.37-9.343-27.5-32.6-18.156-51.97 6.715-13.92 20.638-22.036 35.125-22.03z"/></svg>`;

/**
 * Helps to set up atmosphere parameters.
 */
export class AtmosphereConfig extends Control {
    protected _toggleBtn: ToggleButton;
    protected _dialog: Dialog<null>;
    protected _panel: View<null>;

    public $maxOpacity: HTMLElement | null;
    public $minOpacity: HTMLElement | null;
    public $rayleight: HTMLElement | null;
    public $mie: HTMLElement | null;
    public $height: HTMLElement | null;
    public $bottomRadius: HTMLElement | null;
    public $mieScatteringCoefficient: HTMLElement | null;
    public $mieExtinctionCoefficient: HTMLElement | null;
    public $rayleighScatteringCoefficientA: HTMLElement | null;
    public $rayleighScatteringCoefficientB: HTMLElement | null;
    public $rayleighScatteringCoefficientC: HTMLElement | null;
    public $ozoneAbsorptionCoefficientA: HTMLElement | null;
    public $ozoneAbsorptionCoefficientB: HTMLElement | null;
    public $ozoneAbsorptionCoefficientC: HTMLElement | null;
    public $sunAngularRadius: HTMLElement | null;
    public $sunIntensity: HTMLElement | null;
    public $groundAlbedo: HTMLElement | null;
    public $ozoneDensityHeight: HTMLElement | null;
    public $ozoneDensityWide: HTMLElement | null;

    protected _maxOpacity: Slider;
    protected _minOpacity: Slider;
    protected _rayleight: Slider;
    protected _mie: Slider;
    protected _height: Slider;
    protected _bottomRadius: Slider;
    protected _mieScatteringCoefficient: Slider;
    protected _mieExtinctionCoefficient: Slider;
    protected _rayleighScatteringCoefficientA: Slider;
    protected _rayleighScatteringCoefficientB: Slider;
    protected _rayleighScatteringCoefficientC: Slider;
    protected _ozoneAbsorptionCoefficientA: Slider;
    protected _ozoneAbsorptionCoefficientB: Slider;
    protected _ozoneAbsorptionCoefficientC: Slider;
    protected _sunAngularRadius: Slider;
    protected _sunIntensity: Slider;
    protected _groundAlbedo: Slider;
    protected _ozoneDensityHeight: Slider;
    protected _ozoneDensityWide: Slider;

    protected _parameters: AtmosphereParameters;

    constructor(options: IAtmosphereConfigParams = {}) {
        super(options);

        this.$maxOpacity = null;
        this.$minOpacity = null;
        this.$rayleight = null;
        this.$mie = null;
        this.$height = null;
        this.$bottomRadius = null;
        this.$mieScatteringCoefficient = null;
        this.$mieExtinctionCoefficient = null;
        this.$rayleighScatteringCoefficientA = null;
        this.$rayleighScatteringCoefficientB = null;
        this.$rayleighScatteringCoefficientC = null;
        this.$ozoneAbsorptionCoefficientA = null;
        this.$ozoneAbsorptionCoefficientB = null;
        this.$ozoneAbsorptionCoefficientC = null;
        this.$sunAngularRadius = null;
        this.$sunIntensity = null;
        this.$groundAlbedo = null;
        this.$ozoneDensityHeight = null;
        this.$ozoneDensityWide = null;

        this._toggleBtn = new ToggleButton({
            classList: ["og-map-button", "og-atmosphere_button"],
            icon: ICON_BUTTON_SVG
        });

        this._dialog = new Dialog({
            title: "Atmosphere Parameters",
            visible: false,
            useHide: true,
            top: 60,
            left: 60,
            width: 720
        });

        this._dialog.events.on("visibility", (v: boolean) => {
            this._toggleBtn.setActive(v);
        });

        this._panel = new View({
            template: TEMPLATE
        });

        this._maxOpacity = new Slider({
            label: "Max.opacity",
            max: 5
        });

        this._minOpacity = new Slider({
            label: "Min.opacity",
            max: 5
        });

        this._rayleight = new Slider({
            label: "Rayleight Scale",
            min: -10.0,
            max: 10.0
        });

        this._mie = new Slider({
            label: "Mie Scale",
            min: -10.0,
            max: 10.0
        });

        this._height = new Slider({
            label: "Height",
            max: 1000000.0
        });

        this._bottomRadius = new Slider({
            label: "Planet Radius",
            max: 5 * 6356752.3142451793
        });

        this._mieScatteringCoefficient = new Slider({
            label: "Mie Scattering Coefficient e-6",
            min: -10 * 3.996,
            max: 10 * 3.996
        });

        this._mieExtinctionCoefficient = new Slider({
            label: "Mie Extinction Coef.e-6",
            min: -10 * 4.440,
            max: 10 * 4.440
        });

        this._rayleighScatteringCoefficientA = new Slider({
            label: "Rayleight Scattering Coef A.e-6",
            min: -10 * 5.802,
            max: 10 * 5.802
        });

        this._rayleighScatteringCoefficientB = new Slider({
            label: "Rayleight Scattering Coef B.e-6",
            min: -10 * 13.558,
            max: 10 * 13.558
        });

        this._rayleighScatteringCoefficientC = new Slider({
            label: "Rayleight Scattering Coef C.e-6",
            min: -10 * 33.100,
            max: 10 * 33.100
        });

        this._ozoneAbsorptionCoefficientA = new Slider({
            label: "Ozone absorbtion Coef A.e-6",
            min: -10 * 0.650,
            max: 10 * 0.650
        });

        this._ozoneAbsorptionCoefficientB = new Slider({
            label: "Ozone absorbtion Coef B.e-6",
            min: -10 * 0.650,
            max: 10 * 1.881
        });

        this._ozoneAbsorptionCoefficientC = new Slider({
            label: "Ozone absorbtion Coef C.e-6",
            min: -10 * 0.085,
            max: 10 * 0.085
        });

        this._ozoneDensityHeight = new Slider({
            label: "Ozone Density Height",
            max: 100 * 25000
        });

        this._ozoneDensityWide = new Slider({
            label: "Ozone Density Wide",
            max: 100 * 25000
        });

        this._sunAngularRadius = new Slider({
            label: "Sun Angular Radius",
            max: 1000 * 0.004685
        });

        this._sunIntensity = new Slider({
            label: "Sun Intensity",
            max: 10 * 1.0
        });

        this._groundAlbedo = new Slider({
            label: "Earth Albedo",
            max: 10 * 0.05
        });

        this._parameters = {
            ATMOS_HEIGHT: 0,
            RAYLEIGH_SCALE: 0,
            MIE_SCALE: 0,
            GROUND_ALBEDO: 0,
            BOTTOM_RADIUS: 0,
            rayleighScatteringCoefficient: [0, 0, 0],
            mieScatteringCoefficient: 0,
            mieExtinctionCoefficient: 0,
            ozoneAbsorptionCoefficient: [0, 0, 0],
            SUN_ANGULAR_RADIUS: 0,
            SUN_INTENSITY: 0,
            ozoneDensityHeight: 0,
            ozoneDensityWide: 0,
        }
    }

    public override oninit() {

        this._toggleBtn.appendTo(this.renderer!.div!);
        this._dialog.appendTo(this.renderer!.div!);
        this._panel.appendTo(this._dialog.container!);

        if (this._panel.el) {
            this.$height = this._panel.el.querySelector(".og-option.og-atmosphere-height");
            this.$maxOpacity = this._panel.el.querySelector(".og-option.og-atmosphere-maxOpacity");
            this.$minOpacity = this._panel.el.querySelector(".og-option.og-atmosphere-minOpacity");
            this.$rayleight = this._panel.el.querySelector(".og-option.og-atmosphere-rayleight");
            this.$mie = this._panel.el.querySelector(".og-option.og-atmosphere-mie");
            this.$bottomRadius = this._panel.el.querySelector(".og-option.og-atmosphere-bottomRadius");
            this.$mieScatteringCoefficient = this._panel.el.querySelector(".og-option.og-atmosphere-mieScatteringCoefficient");
            this.$mieExtinctionCoefficient = this._panel.el.querySelector(".og-option.og-atmosphere-mieExtinctionCoefficient");
            this.$rayleighScatteringCoefficientA = this._panel.el.querySelector(".og-option.og-atmosphere-rayleighScatteringCoefficientA");
            this.$rayleighScatteringCoefficientB = this._panel.el.querySelector(".og-option.og-atmosphere-rayleighScatteringCoefficientB");
            this.$rayleighScatteringCoefficientC = this._panel.el.querySelector(".og-option.og-atmosphere-rayleighScatteringCoefficientC");
            this.$ozoneAbsorptionCoefficientA = this._panel.el.querySelector(".og-option.og-atmosphere-ozoneAbsorptionCoefficientA");
            this.$ozoneAbsorptionCoefficientB = this._panel.el.querySelector(".og-option.og-atmosphere-ozoneAbsorptionCoefficientB");
            this.$ozoneAbsorptionCoefficientC = this._panel.el.querySelector(".og-option.og-atmosphere-ozoneAbsorptionCoefficientC");
            this.$sunAngularRadius = this._panel.el.querySelector(".og-option.og-atmosphere-sunAngularRadius");
            this.$sunIntensity = this._panel.el.querySelector(".og-option.og-atmosphere-sunIntensity");
            this.$groundAlbedo = this._panel.el.querySelector(".og-option.og-atmosphere-earthAlbedo");
            this.$ozoneDensityHeight = this._panel.el.querySelector(".og-option.og-atmosphere-ozoneDensityHeight");
            this.$ozoneDensityWide = this._panel.el.querySelector(".og-option.og-atmosphere-ozoneDensityWide");
        }

        this._toggleBtn.events.on("change", (isActive: boolean) => {
            this._dialog.setVisibility(isActive);
        });

        this._maxOpacity.appendTo(this.$maxOpacity!);
        this._minOpacity.appendTo(this.$minOpacity!);
        this._height.appendTo(this.$height!);
        this._rayleight.appendTo(this.$rayleight!);
        this._mie.appendTo(this.$mie!);
        this._bottomRadius.appendTo(this.$bottomRadius!);
        this._mieScatteringCoefficient.appendTo(this.$mieScatteringCoefficient!);
        this._mieExtinctionCoefficient.appendTo(this.$mieExtinctionCoefficient!);
        this._rayleighScatteringCoefficientA.appendTo(this.$rayleighScatteringCoefficientA!);
        this._rayleighScatteringCoefficientB.appendTo(this.$rayleighScatteringCoefficientB!);
        this._rayleighScatteringCoefficientC.appendTo(this.$rayleighScatteringCoefficientC!);
        this._ozoneAbsorptionCoefficientA.appendTo(this.$ozoneAbsorptionCoefficientA!);
        this._ozoneAbsorptionCoefficientB.appendTo(this.$ozoneAbsorptionCoefficientB!);
        this._ozoneAbsorptionCoefficientC.appendTo(this.$ozoneAbsorptionCoefficientC!);
        this._sunAngularRadius.appendTo(this.$sunAngularRadius!);
        this._sunIntensity.appendTo(this.$sunIntensity!);
        this._groundAlbedo.appendTo(this.$groundAlbedo!);
        this._ozoneDensityHeight.appendTo(this.$ozoneDensityHeight!);
        this._ozoneDensityWide.appendTo(this.$ozoneDensityWide!);

        if (this.planet) {

            this._parameters = this.planet.atmosphereControl.parameters;

            this._height.value = this._parameters.ATMOS_HEIGHT;
            this._rayleight.value = this._parameters.RAYLEIGH_SCALE;
            this._mie.value = this._parameters.MIE_SCALE;
            this._bottomRadius.value = this._parameters.BOTTOM_RADIUS;
            this._mieScatteringCoefficient.value = this._parameters.mieScatteringCoefficient;
            this._mieExtinctionCoefficient.value = this._parameters.mieExtinctionCoefficient;
            this._rayleighScatteringCoefficientA.value = this._parameters.rayleighScatteringCoefficient[0];
            this._rayleighScatteringCoefficientB.value = this._parameters.rayleighScatteringCoefficient[1];
            this._rayleighScatteringCoefficientC.value = this._parameters.rayleighScatteringCoefficient[2];
            this._ozoneAbsorptionCoefficientA.value = this._parameters.ozoneAbsorptionCoefficient[0];
            this._ozoneAbsorptionCoefficientB.value = this._parameters.ozoneAbsorptionCoefficient[1];
            this._ozoneAbsorptionCoefficientC.value = this._parameters.ozoneAbsorptionCoefficient[2];
            this._sunAngularRadius.value = this._parameters.SUN_ANGULAR_RADIUS;
            this._sunIntensity.value = this._parameters.SUN_INTENSITY;
            this._groundAlbedo.value = this._parameters.GROUND_ALBEDO;
            this._ozoneDensityHeight.value = this._parameters.ozoneDensityHeight;
            this._ozoneDensityWide.value = this._parameters.ozoneDensityWide;
        }


        this._minOpacity.value = this.planet!.atmosphereMinOpacity;
        this._minOpacity.events.on("change", (val: number) => {
            this.planet!.atmosphereMinOpacity = val;
        });

        this._maxOpacity.value = this.planet!.atmosphereMaxOpacity;
        this._maxOpacity.events.on("change", (val: number) => {
            this.planet!.atmosphereMaxOpacity = val;
            //let atmos = this.planet!.renderer!.controls.Atmosphere as Atmosphere;
            //atmos.opacity = val;
        });

        this._rayleight.events.on("change", (val: number) => {
            this._parameters.RAYLEIGH_SCALE = val;
            this._update();
        });

        this._mie.events.on("change", (val: number) => {
            this._parameters.MIE_SCALE = val;
            this._update();
        });

        this._height.events.on("change", (val: number) => {
            this._parameters.ATMOS_HEIGHT = val;
            this._update();
        });

        this._bottomRadius.events.on("change", (val: number) => {
            this._parameters.BOTTOM_RADIUS = val;
            this._update();
        });

        this._mieScatteringCoefficient.events.on("change", (val: number) => {
            this._parameters.mieScatteringCoefficient = val;
            this._update();
        });

        this._mieExtinctionCoefficient.events.on("change", (val: number) => {
            this._parameters.mieExtinctionCoefficient = val;
            this._update();
        });

        this._rayleighScatteringCoefficientA.events.on("change", (val: number) => {
            this._parameters.rayleighScatteringCoefficient[0] = val;
            this._update();
        });

        this._rayleighScatteringCoefficientB.events.on("change", (val: number) => {
            this._parameters.rayleighScatteringCoefficient[1] = val;
            this._update();
        });

        this._rayleighScatteringCoefficientC.events.on("change", (val: number) => {
            this._parameters.rayleighScatteringCoefficient[2] = val;
            this._update();
        });

        this._ozoneAbsorptionCoefficientA.events.on("change", (val: number) => {
            this._parameters.ozoneAbsorptionCoefficient[0] = val;
            this._update();
        });

        this._ozoneAbsorptionCoefficientB.events.on("change", (val: number) => {
            this._parameters.ozoneAbsorptionCoefficient[1] = val;
            this._update();
        });

        this._ozoneAbsorptionCoefficientC.events.on("change", (val: number) => {
            this._parameters.ozoneAbsorptionCoefficient[2] = val;
            this._update();
        });

        this._sunAngularRadius.events.on("change", (val: number) => {
            this._parameters.SUN_ANGULAR_RADIUS = val;
            this._update();
        });

        this._sunIntensity.events.on("change", (val: number) => {
            this._parameters.SUN_INTENSITY = val;
            this._update();
        });

        this._groundAlbedo.events.on("change", (val: number) => {
            this._parameters.GROUND_ALBEDO = val;
            this._update();
        });

        this._ozoneDensityHeight.events.on("change", (val: number) => {
            this._parameters.ozoneDensityHeight = val;
            this._update();
        });

        this._ozoneDensityWide.events.on("change", (val: number) => {
            this._parameters.ozoneDensityWide = val;
            this._update();
        });
    }

    protected _update() {
        if (this.planet) {
            this.planet.atmosphereControl.setParameters(this._parameters);
        }
    }
}
