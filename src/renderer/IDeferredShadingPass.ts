export interface IDeferredShadingPass {
    init(): void;
    beginPass(): void;
    endPass(): void;
    applyLighting(): void;
    resize(width: number, height: number): void;
    dispose(): void;
}
