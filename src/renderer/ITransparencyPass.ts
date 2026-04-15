export interface ITransparencyPass {
    init(): void;
    beginPass(): void;
    endPass(): void;
    resolve(): void;
    resize(width: number, height: number): void;
    dispose(): void;
}
