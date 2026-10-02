import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { StarterScene } from '../scenes/StarterScene';
import { TournamentScene } from '../scenes/TournamentScene';
import { TrainingScene } from '../scenes/TrainingScene';
import { BattleScene } from '../scenes/BattleScene';
import { EvolutionScene } from '../scenes/EvolutionScene';
import { RewardScene } from '../scenes/RewardScene';
import { VictoryScene } from '../scenes/VictoryScene';
import { SettingsScene } from '../scenes/SettingsScene';
import { HelpScene } from '../scenes/HelpScene';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#070b18',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 420,
    height: 750,
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    StarterScene,
    TournamentScene,
    TrainingScene,
    BattleScene,
    EvolutionScene,
    RewardScene,
    VictoryScene,
    SettingsScene,
    HelpScene,
  ],
};
