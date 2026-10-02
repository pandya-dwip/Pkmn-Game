import Phaser from 'phaser';
import { gameState } from '../systems/GameState';
import { BattleSystem, BattleTurnStep } from '../systems/BattleSystem';
import { TOURNAMENT_ROUNDS, generateOpponentTeam } from '../data/trainers';
import { AttackAnimationManager } from '../animations/AttackAnimations';
import { HealthBar } from '../ui/HealthBar';
import { BattleMenu } from '../ui/BattleMenu';
import { DialogBox } from '../ui/DialogBox';
import { ModalDialog } from '../ui/ModalDialog';
import { audioManager } from '../systems/AudioManager';
import { ASSETS } from '../utils/AssetLoader';
import { BattleAction, PokemonInstance } from '../types';
import { getPokemonSpecies } from '../data/pokemon';
import { InventorySystem } from '../systems/InventorySystem';

export class BattleScene extends Phaser.Scene {
  private battleSystem!: BattleSystem;
  private animManager!: AttackAnimationManager;

  // Visual Entities
  private opponentHPBar!: HealthBar;
  private playerHPBar!: HealthBar;
  private opponentContainer!: Phaser.GameObjects.Container;
  private playerContainer!: Phaser.GameObjects.Container;
  private opponentSprite!: Phaser.GameObjects.Image;
  private playerSprite!: Phaser.GameObjects.Image;
  private opponentShadow!: Phaser.GameObjects.Image;
  private playerShadow!: Phaser.GameObjects.Image;

  private battleMenu!: BattleMenu;
  private dialogBox!: DialogBox;
  private teamSelectModal!: ModalDialog;
  private bagModal!: ModalDialog;

  private isExecutingTurn = false;

  constructor() {
    super('BattleScene');
  }

  public create(): void {
    const { width, height } = this.scale;
    const roundIndex = gameState.currentRound;
    const roundConfig = TOURNAMENT_ROUNDS[roundIndex] || TOURNAMENT_ROUNDS[0];

    // Pick music theme (final, semi, intense, or normal battle)
    const musicTheme = roundIndex === 5 ? 'final' : roundIndex === 4 ? 'semi' : roundIndex >= 3 ? 'intense' : 'battle';
    audioManager.playMusic(musicTheme);

    // 1. Initialize Battle System
    const playerTeam = gameState.getPlayerTeam();
    const activePlayerId = gameState.activePokemonId || playerTeam[0].instanceId;
    const oppTeam = generateOpponentTeam(roundIndex, Math.round(playerTeam.reduce((a, m) => a + m.level, 0) / playerTeam.length));
    const oppTrainerName = gameState.tournamentBracket.trainers[gameState.tournamentBracket.activeList[1] || 1]?.name || 'Trainer Rival';

    this.battleSystem = new BattleSystem(
      playerTeam,
      oppTeam,
      activePlayerId,
      oppTrainerName,
      roundConfig.aiLevel,
      roundConfig.foeBerries,
      gameState.inventory
    );

    this.animManager = new AttackAnimationManager(this);

    // 2. Render Kanto Outdoor Environment (No Spectators)
    this.createBattlefieldEnvironment(width, height);

    // 3. Create Pokémon GameObjects (Strict mobile-first layout)
    // Opponent Mon Position: x = width * 0.72, y = height * 0.28
    // Player Mon Position:   x = width * 0.28, y = height * 0.58
    this.createPokemonEntities(width, height);

    // 4. Create HP Panels
    // Opponent HP Panel: top left (x: 16, y: 16)
    // Player HP Panel: right above controls (x: width - 216, y: height * 0.64)
    this.opponentHPBar = new HealthBar(this, 16, 16, this.battleSystem.getActiveOpponentMon(), false);
    this.playerHPBar = new HealthBar(this, width - 216, height * 0.63, this.battleSystem.getActivePlayerMon(), true);

    this.updateTeamDots();

    // 5. Create Compact Battle Log / Dialog Box
    this.dialogBox = new DialogBox(this, 16, height * 0.73, width - 32, 46);

    // 6. Create Battle Controls
    this.battleMenu = new BattleMenu(this, 16, height * 0.81, width - 32, action => this.handlePlayerAction(action));
    this.battleMenu.setPokemon(this.battleSystem.getActivePlayerMon(), this.battleSystem.getActiveOpponentMon());

    // 7. Modals for Switching and Bag Items
    this.teamSelectModal = new ModalDialog(this, Math.min(320, width - 32), 380);
    this.bagModal = new ModalDialog(this, Math.min(320, width - 32), 380);

    // 8. Battle Intro Sequence
    this.playBattleIntro(oppTrainerName);
  }

  private createBattlefieldEnvironment(width: number, height: number): void {
    const env = this.add.graphics();

    // Sky with smooth atmospheric gradient
    env.fillGradientStyle(0x3870b2, 0x3870b2, 0x8ec5eb, 0x8ec5eb, 1);
    env.fillRect(0, 0, width, height * 0.42);

    // Clouds
    env.fillStyle(0xffffff, 0.7);
    env.fillEllipse(width * 0.25, height * 0.1, 80, 18);
    env.fillEllipse(width * 0.35, height * 0.08, 60, 15);
    env.fillEllipse(width * 0.78, height * 0.09, 90, 20);

    // Distant rolling hills
    env.fillStyle(0x6e9b75, 0.85);
    env.fillEllipse(width * 0.2, height * 0.34, 180, 60);
    env.fillEllipse(width * 0.8, height * 0.35, 220, 70);

    // Distant Kanto Houses / Roofs
    env.fillStyle(0x9a3424, 1); // terracotta roof
    env.fillTriangle(width * 0.52, height * 0.33, width * 0.62, height * 0.28, width * 0.72, height * 0.33);
    env.fillStyle(0xf1e4d0, 1); // wall
    env.fillRect(width * 0.54, height * 0.33, 48, 22);

    // Distant natural trees
    env.fillStyle(0x386629, 1);
    env.fillCircle(width * 0.12, height * 0.32, 24);
    env.fillCircle(width * 0.88, height * 0.33, 28);
    env.fillCircle(width * 0.94, height * 0.35, 22);

    // Foreground grassy arena with perspective
    env.fillGradientStyle(0x7bb848, 0x7bb848, 0x2e6b23, 0x2e6b23, 1);
    env.fillRect(0, height * 0.38, width, height * 0.62);

    // Subtle sunbeams / depth lighting
    env.fillStyle(0xffffff, 0.04);
    env.fillTriangle(width * 0.5, 0, width, height * 0.8, width * 0.3, height * 0.8);
  }

  private createPokemonEntities(width: number, height: number): void {
    // 1. Opponent Pokémon Container (top-right side of field)
    const oppX = width * 0.74;
    const oppY = height * 0.28;

    this.opponentContainer = this.add.container(oppX, oppY);
    this.opponentShadow = this.add.image(0, 48, 'ground_shadow');
    this.opponentShadow.setDisplaySize(110, 36);
    this.opponentContainer.add(this.opponentShadow);

    const oppMon = this.battleSystem.getActiveOpponentMon();
    this.opponentSprite = this.add.image(0, 0, ASSETS.pokemon(oppMon.speciesId));
    this.opponentSprite.setDisplaySize(115, 115);
    this.opponentContainer.add(this.opponentSprite);

    // Idle breathing animation
    this.tweens.add({
      targets: this.opponentSprite,
      y: -4,
      scaleY: 1.025,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 2. Player Pokémon Container (bottom-left side of field)
    const playerX = width * 0.28;
    const playerY = height * 0.54;

    this.playerContainer = this.add.container(playerX, playerY);
    this.playerShadow = this.add.image(0, 56, 'ground_shadow');
    this.playerShadow.setDisplaySize(140, 44);
    this.playerContainer.add(this.playerShadow);

    const playerMon = this.battleSystem.getActivePlayerMon();
    this.playerSprite = this.add.image(0, 0, ASSETS.pokemon(playerMon.speciesId));
    this.playerSprite.setDisplaySize(145, 145);
    this.playerContainer.add(this.playerSprite);

    // Player subtle idle breathing
    this.tweens.add({
      targets: this.playerSprite,
      y: -6,
      scaleY: 1.03,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private updateTeamDots(): void {
    this.opponentHPBar.updateTeamDots(this.battleSystem.opponentTeam, this.battleSystem.activeOpponentMonId);
    this.playerHPBar.updateTeamDots(this.battleSystem.playerTeam, this.battleSystem.activePlayerMonId);
  }

  private async playBattleIntro(oppTrainerName: string): Promise<void> {
    this.battleMenu.lockControls(true);

    const oppMon = this.battleSystem.getActiveOpponentMon();
    const playerMon = this.battleSystem.getActivePlayerMon();

    audioManager.playPokemonCry(oppMon.speciesId, 'intro');
    await this.dialogBox.showMessage(`${oppTrainerName} sent out ${getPokemonSpecies(oppMon.speciesId).name}!`, 1000);

    audioManager.playPokemonCry(playerMon.speciesId, 'intro');
    await this.dialogBox.showMessage(`Go! ${getPokemonSpecies(playerMon.speciesId).name}!`, 800);

    this.battleMenu.lockControls(false);
  }

  private async handlePlayerAction(action: BattleAction): Promise<void> {
    if (this.isExecutingTurn) return;

    if (action.type === 'POKEMON') {
      this.openSwitchModal();
      return;
    }

    if (action.type === 'BAG') {
      this.openBagModal();
      return;
    }

    if (action.type === 'RUN') {
      await this.dialogBox.showMessage("You can't run from a tournament battle!", 800);
      return;
    }

    // Execute combat turn (One Player Action = Exactly One Opponent Action!)
    this.isExecutingTurn = true;
    this.battleMenu.lockControls(true);

    const turnResult = this.battleSystem.executeTurn(action);

    for (const step of turnResult.steps) {
      await this.processTurnStep(step);
    }

    // Check if battle resolved
    if (turnResult.battleOver) {
      if (turnResult.winner === 'player') {
        await this.handleBattleWon(turnResult.expGains);
      } else {
        await this.handleBattleLost();
      }
      return;
    }

    // Check if opponent fainted and needs deployment
    if (this.battleSystem.getActiveOpponentMon().currentHP <= 0) {
      const nextMon = this.battleSystem.autoDeployNextOpponentMon();
      if (nextMon) {
        this.opponentSprite.setTexture(ASSETS.pokemon(nextMon.speciesId));
        this.opponentHPBar.updatePokemon(nextMon);
        this.updateTeamDots();
        audioManager.playPokemonCry(nextMon.speciesId, 'intro');
        await this.dialogBox.showMessage(
          `${this.battleSystem.opponentTrainerName} sent out ${getPokemonSpecies(nextMon.speciesId).name}!`,
          900
        );
      }
    }

    // Check if player active mon fainted and needs replacement
    if (this.battleSystem.getActivePlayerMon().currentHP <= 0) {
      const available = this.battleSystem.getAvailablePlayerSwitches();
      if (available.length > 0) {
        await this.dialogBox.showMessage('Choose your next Pokémon!', 600);
        this.openForcedSwitchModal();
        return;
      }
    }

    this.battleMenu.setPokemon(this.battleSystem.getActivePlayerMon(), this.battleSystem.getActiveOpponentMon());
    this.battleMenu.showMain();
    this.battleMenu.lockControls(false);
    this.isExecutingTurn = false;
  }

  private async processTurnStep(step: BattleTurnStep): Promise<void> {
    const isPlayer = step.actor === 'player';
    const attackerSprite = isPlayer ? this.playerContainer : this.opponentContainer;
    const defenderSprite = isPlayer ? this.opponentContainer : this.playerContainer;
    const defenderHPBar = isPlayer ? this.opponentHPBar : this.playerHPBar;

    if (step.actionType === 'SWITCH' && step.switchTargetId) {
      const switchedMon = isPlayer
        ? this.battleSystem.playerTeam.find(m => m.instanceId === step.switchTargetId)!
        : this.battleSystem.opponentTeam.find(m => m.instanceId === step.switchTargetId)!;

      // Recall animation
      await this.playRecall(attackerSprite);
      if (isPlayer) {
        this.playerSprite.setTexture(ASSETS.pokemon(switchedMon.speciesId));
        this.playerHPBar.updatePokemon(switchedMon);
      } else {
        this.opponentSprite.setTexture(ASSETS.pokemon(switchedMon.speciesId));
        this.opponentHPBar.updatePokemon(switchedMon);
      }
      this.updateTeamDots();

      // Deploy animation
      await this.playDeploy(attackerSprite);
      audioManager.playPokemonCry(switchedMon.speciesId, 'intro');
      await this.dialogBox.showMessage(step.message, 800);
      return;
    }

    if (step.actionType === 'ITEM') {
      audioManager.playItemUse();
      const targetMon = isPlayer ? this.battleSystem.getActivePlayerMon() : this.battleSystem.getActiveOpponentMon();
      const bar = isPlayer ? this.playerHPBar : this.opponentHPBar;
      await bar.animateHP(targetMon.currentHP, targetMon.maxHP);
      await this.dialogBox.showMessage(step.message, 800);
      return;
    }

    if (step.actionType === 'MOVE' && step.move) {
      // 1. Announce attack
      await this.dialogBox.showMessage(step.message, 300);

      // 2. Play attack animation
      audioManager.playPokemonCry(
        isPlayer ? this.battleSystem.getActivePlayerMon().speciesId : this.battleSystem.getActiveOpponentMon().speciesId,
        'attack'
      );
      await this.animManager.playAttackAnimation(attackerSprite, defenderSprite, step.move, isPlayer);

      // 3. Play hit reaction on defender
      if (step.damageResult && step.damageResult.isHit && step.damageResult.effectiveness > 0) {
        audioManager.playHitSound(step.damageResult.effectiveness, step.damageResult.isCritical);
        await this.playHitReaction(defenderSprite);

        // Show floating damage number
        this.showFloatingDamage(defenderSprite.x, defenderSprite.y, step.damageResult.damage, step.damageResult.isCritical);

        // Update defender HP Bar
        const defMon = isPlayer ? this.battleSystem.getActiveOpponentMon() : this.battleSystem.getActivePlayerMon();
        await defenderHPBar.animateHP(defMon.currentHP, defMon.maxHP);
      }

      // 4. Faint animation if defeated
      if (step.targetFainted) {
        const defMon = isPlayer ? this.battleSystem.getActiveOpponentMon() : this.battleSystem.getActivePlayerMon();
        audioManager.playPokemonCry(defMon.speciesId, 'faint');
        await this.playFaint(defenderSprite);
        this.updateTeamDots();
        await this.dialogBox.showMessage(`${getPokemonSpecies(defMon.speciesId).name} fainted!`, 800);
      }
    }
  }

  private playHitReaction(sprite: Phaser.GameObjects.Container): Promise<void> {
    return new Promise(resolve => {
      const origX = sprite.x;
      this.tweens.add({
        targets: sprite,
        x: origX - 12,
        alpha: 0.4,
        duration: 80,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          sprite.x = origX;
          sprite.alpha = 1;
          resolve();
        },
      });
    });
  }

  private showFloatingDamage(x: number, y: number, damage: number, critical: boolean): void {
    const text = this.add.text(x, y - 20, `-${damage}${critical ? ' CRIT!' : ''}`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: critical ? '22px' : '18px',
      fontStyle: 'bold',
      color: critical ? '#ffd54a' : '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    });
    text.setOrigin(0.5);
    text.setDepth(150);

    this.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  private playFaint(sprite: Phaser.GameObjects.Container): Promise<void> {
    return new Promise(resolve => {
      this.tweens.add({
        targets: sprite,
        y: sprite.y + 40,
        alpha: 0,
        scaleY: 0.5,
        duration: 600,
        ease: 'Quad.easeIn',
        onComplete: () => resolve(),
      });
    });
  }

  private playRecall(sprite: Phaser.GameObjects.Container): Promise<void> {
    return new Promise(resolve => {
      this.tweens.add({
        targets: sprite,
        scale: 0.1,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeIn',
        onComplete: () => resolve(),
      });
    });
  }

  private playDeploy(sprite: Phaser.GameObjects.Container): Promise<void> {
    return new Promise(resolve => {
      sprite.setScale(0.1);
      sprite.setAlpha(0);
      this.tweens.add({
        targets: sprite,
        scale: 1,
        alpha: 1,
        duration: 350,
        ease: 'Back.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  // --- Modals: Switching and Items ---
  private openSwitchModal(): void {
    const card = this.teamSelectModal.getCard();
    card.removeAll(true);

    const title = this.add.text(0, -150, 'SELECT POKÉMON', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffd54a',
    });
    title.setOrigin(0.5);
    card.add(title);

    const available = this.battleSystem.playerTeam;
    available.forEach((m, idx) => {
      const by = -100 + idx * 46;
      const isCurrent = m.instanceId === this.battleSystem.activePlayerMonId;
      const isFainted = m.currentHP <= 0;

      const row = this.add.container(0, by);
      const bg = this.add.graphics();
      bg.fillStyle(isCurrent ? 0x1e293b : isFainted ? 0x111827 : 0x1e293b, 0.9);
      bg.fillRoundedRect(-140, -18, 280, 38, 8);
      bg.lineStyle(1.5, isCurrent ? 0x3a86ff : isFainted ? 0x475569 : 0x22c55e, 1);
      bg.strokeRoundedRect(-140, -18, 280, 38, 8);
      row.add(bg);

      const monIcon = this.add.image(-110, 0, ASSETS.pokemon(m.speciesId));
      monIcon.setDisplaySize(30, 30);
      row.add(monIcon);

      const species = getPokemonSpecies(m.speciesId);
      const name = this.add.text(-85, -10, `${species.name} (Lv.${m.level})`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: isFainted ? '#64748b' : '#ffffff',
      });
      row.add(name);

      const hp = this.add.text(-85, 4, isFainted ? 'FAINTED' : `HP ${m.currentHP}/${m.maxHP}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '10px',
        color: isFainted ? '#ef4444' : '#94a3b8',
      });
      row.add(hp);

      if (!isCurrent && !isFainted) {
        bg.setInteractive(new Phaser.Geom.Rectangle(-140, -18, 280, 38), Phaser.Geom.Rectangle.Contains);
        bg.on('pointerdown', () => {
          this.teamSelectModal.hide();
          this.handlePlayerAction({ type: 'POKEMON', switchIndex: idx });
        });
      }

      card.add(row);
    });

    // Close button
    const closeBtn = this.add.container(0, 150);
    const closeBg = this.add.graphics();
    closeBg.fillStyle(0x334155, 1);
    closeBg.fillRoundedRect(-50, -14, 100, 28, 6);
    closeBtn.add(closeBg);

    const closeText = this.add.text(0, 0, 'CANCEL', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    closeText.setOrigin(0.5);
    closeBtn.add(closeText);

    closeBg.setInteractive(new Phaser.Geom.Rectangle(-50, -14, 100, 28), Phaser.Geom.Rectangle.Contains);
    closeBg.on('pointerdown', () => this.teamSelectModal.hide());
    card.add(closeBtn);

    this.teamSelectModal.show();
  }

  private openForcedSwitchModal(): void {
    const card = this.teamSelectModal.getCard();
    card.removeAll(true);

    const title = this.add.text(0, -140, 'CHOOSE NEXT POKÉMON', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#ffd54a',
    });
    title.setOrigin(0.5);
    card.add(title);

    const alive = this.battleSystem.playerTeam.filter(m => m.currentHP > 0);
    alive.forEach((m, idx) => {
      const by = -80 + idx * 50;
      const row = this.add.container(0, by);
      const bg = this.add.graphics();
      bg.fillStyle(0x1e293b, 0.95);
      bg.fillRoundedRect(-140, -20, 280, 42, 8);
      bg.lineStyle(1.5, 0x22c55e, 1);
      bg.strokeRoundedRect(-140, -20, 280, 42, 8);
      row.add(bg);

      const monIcon = this.add.image(-110, 0, ASSETS.pokemon(m.speciesId));
      monIcon.setDisplaySize(34, 34);
      row.add(monIcon);

      const species = getPokemonSpecies(m.speciesId);
      const name = this.add.text(-80, -10, `${species.name} Lv.${m.level}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      row.add(name);

      const hp = this.add.text(-80, 6, `HP ${m.currentHP}/${m.maxHP}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '11px',
        color: '#4ade80',
      });
      row.add(hp);

      bg.setInteractive(new Phaser.Geom.Rectangle(-140, -20, 280, 42), Phaser.Geom.Rectangle.Contains);
      bg.on('pointerdown', async () => {
        await this.teamSelectModal.hide();
        this.battleSystem.switchPlayerMon(m.instanceId);
        this.playerSprite.setTexture(ASSETS.pokemon(m.speciesId));
        this.playerHPBar.updatePokemon(m);
        this.updateTeamDots();
        await this.playDeploy(this.playerContainer);
        audioManager.playPokemonCry(m.speciesId, 'intro');
        await this.dialogBox.showMessage(`Go! ${species.name}!`, 800);

        this.battleMenu.setPokemon(m, this.battleSystem.getActiveOpponentMon());
        this.battleMenu.showMain();
        this.battleMenu.lockControls(false);
        this.isExecutingTurn = false;
      });

      card.add(row);
    });

    this.teamSelectModal.show();
  }

  private openBagModal(): void {
    const card = this.bagModal.getCard();
    card.removeAll(true);

    const title = this.add.text(0, -150, 'BAG & ITEMS', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffd54a',
    });
    title.setOrigin(0.5);
    card.add(title);

    const inv = gameState.inventory;
    const items = [
      { key: 'healthBerry', icon: '🍓', name: 'Health Berry', count: inv.healthBerries, desc: 'Restores 30% max HP' },
      { key: 'fullHealBerry', icon: '✨', name: 'Full Heal Berry', count: inv.fullHealBerries, desc: 'Restores 100% max HP' },
      { key: 'revive', icon: '💊', name: 'Revive', count: inv.revives, desc: 'Revives fainted mon to 50% HP' },
    ];

    items.forEach((item, idx) => {
      const by = -90 + idx * 56;
      const canUse = item.count > 0;

      const row = this.add.container(0, by);
      const bg = this.add.graphics();
      bg.fillStyle(canUse ? 0x1e293b : 0x0f172a, 0.95);
      bg.fillRoundedRect(-140, -22, 280, 48, 8);
      bg.lineStyle(1.5, canUse ? 0xf59e0b : 0x334155, 1);
      bg.strokeRoundedRect(-140, -22, 280, 48, 8);
      row.add(bg);

      const icon = this.add.text(-120, 0, item.icon, { fontSize: '20px' });
      icon.setOrigin(0.5);
      row.add(icon);

      const name = this.add.text(-95, -12, `${item.name} ×${item.count}`, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: canUse ? '#ffffff' : '#64748b',
      });
      row.add(name);

      const desc = this.add.text(-95, 4, item.desc, {
        fontFamily: 'Outfit, sans-serif',
        fontSize: '10px',
        color: '#94a3b8',
      });
      row.add(desc);

      if (canUse) {
        bg.setInteractive(new Phaser.Geom.Rectangle(-140, -22, 280, 48), Phaser.Geom.Rectangle.Contains);
        bg.on('pointerdown', () => {
          this.bagModal.hide();
          this.handlePlayerAction({ type: 'BAG', itemKey: item.key });
        });
      }

      card.add(row);
    });

    const closeBtn = this.add.container(0, 140);
    const closeBg = this.add.graphics();
    closeBg.fillStyle(0x334155, 1);
    closeBg.fillRoundedRect(-50, -14, 100, 28, 6);
    closeBtn.add(closeBg);

    const closeText = this.add.text(0, 0, 'CANCEL', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    closeText.setOrigin(0.5);
    closeBtn.add(closeText);

    closeBg.setInteractive(new Phaser.Geom.Rectangle(-50, -14, 100, 28), Phaser.Geom.Rectangle.Contains);
    closeBg.on('pointerdown', () => this.bagModal.hide());
    card.add(closeBtn);

    this.bagModal.show();
  }

  // --- Battle Termination ---
  private async handleBattleWon(
    expGains?: { pokemon: PokemonInstance; exp: number }[]
  ): Promise<void> {
    audioManager.playPokemonCry(this.battleSystem.getActivePlayerMon().speciesId, 'win');
    await this.dialogBox.showMessage(`You defeated ${this.battleSystem.opponentTrainerName}!`, 1000);

    // Save progression
    gameState.currentRound++;
    if (gameState.currentRound >= 4) {
      gameState.maxTrainingSessions = 10;
      gameState.trainingSessionsRemaining = 10;
      gameState.specialEvolutionCount = 2; // Semi-Final evolution reward!
    } else {
      gameState.maxTrainingSessions = 5;
      gameState.trainingSessionsRemaining = 5;
    }

    gameState.persist();

    // Check if tournament champion
    if (gameState.currentRound >= 6) {
      this.scene.start('VictoryScene');
    } else {
      this.scene.start('RewardScene', { roundIndex: gameState.currentRound - 1 });
    }
  }

  private async handleBattleLost(): Promise<void> {
    await this.dialogBox.showMessage('Your entire team has fainted... You were eliminated.', 1400);

    // Revive team with 50% HP so game remains playable
    gameState.playerTeamIds.forEach(id => {
      const mon = gameState.playerCollection.find(m => m.instanceId === id);
      if (mon && mon.currentHP <= 0) {
        mon.currentHP = Math.ceil(mon.maxHP * 0.5);
        mon.status = 'NORMAL';
      }
    });
    gameState.persist();

    this.scene.start('TournamentScene');
  }
}
