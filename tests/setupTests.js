import "regenerator-runtime/runtime";
import { Worker } from "./worker";


window.Worker = Worker;


global.URL.createObjectURL = jest.fn(() => "");
