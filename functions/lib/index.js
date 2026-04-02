"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase-admin/app");
const v2_1 = require("firebase-functions/v2");
(0, app_1.initializeApp)();
(0, v2_1.setGlobalOptions)({ maxInstances: 10, region: 'asia-northeast3' });
__exportStar(require("./auth/validateCode"), exports);
__exportStar(require("./auth/createAccessCode"), exports);
__exportStar(require("./auth/extendCodeExpiration"), exports);
__exportStar(require("./progress/checkMastery"), exports);
__exportStar(require("./stats/updateStreaks"), exports);
__exportStar(require("./stats/resetWeeklyRankings"), exports);
__exportStar(require("./stats/getRankings"), exports);
__exportStar(require("./admin/processCSV"), exports);
__exportStar(require("./tts/textToSpeech"), exports);
//# sourceMappingURL=index.js.map