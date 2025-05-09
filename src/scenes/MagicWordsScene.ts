import * as PIXI from 'pixi.js';
import { Scene } from './Scene';
import { Button } from '../components/Button';

interface DialogueLine {
    name: string;
    text: string;
}

interface Emoji {
    name: string;
    url: string;
    texture?: PIXI.Texture;
}

interface Avatar {
    name: string;
    url: string;
    position: 'left' | 'right';
    texture?: PIXI.Texture;
    sprite?: PIXI.Sprite;
}

interface DialogueData {
    dialogue: DialogueLine[];
    emojies: Emoji[];
    avatars: Avatar[];
}

export class MagicWordsScene extends Scene {
    private dialogueData: DialogueData | null = null;
    private currentLineIndex: number = 0;
    private dialogueText: PIXI.Text;
    private speakerName: PIXI.Text;
    private continueButton: Button;
    private restartButton: Button;
    private isAnimating: boolean = false;
    private currentCharIndex: number = 0;
    private emojiSprites: Map<string, PIXI.Sprite> = new Map();
    private avatarSprites: Map<string, PIXI.Sprite> = new Map();
    private currentAvatar: PIXI.Sprite | null = null;
    private loadingText: PIXI.Text;
    private isLoading: boolean = true;
    private dialogueContainer: PIXI.Container;
    private charSprites: PIXI.Text[] = [];
    private readonly CHAR_SPACING = 1;
    private readonly EMOJI_SPACING = -10;
    private readonly LINE_HEIGHT = 32;

    private get maxLineWidth(): number {
        return this.app.screen.width <= 768
            ? this.app.screen.width * 0.95 * 0.9
            : this.app.screen.width * 0.4 * 0.9;
    }

    constructor(app: PIXI.Application) {
        super(app);

        // Initialize UI elements
        this.dialogueText = new PIXI.Text('');
        this.speakerName = new PIXI.Text('');
        this.continueButton = new Button(app, 'Continue', () => this.onContinueClick(), {
            width: 120,
            height: 40,
            backgroundColor: 0x4caf50,
        });

        // Add restart button
        this.restartButton = new Button(app, 'Restart', () => this.restartDialogue(), {
            width: 120,
            height: 40,
            backgroundColor: 0x4caf50,
        });
        this.restartButton.setVisible(false);

        // Add loading text
        this.loadingText = new PIXI.Text('Loading...', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0x333333,
            align: 'center',
        });
        this.loadingText.anchor.set(0.5);
        this.loadingText.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
        this.addChild(this.loadingText);

        // Initialize dialogue container
        this.dialogueContainer = new PIXI.Container();
        this.addChild(this.dialogueContainer);

        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            const response = await fetch(
                'https://private-624120-softgamesassignment.apiary-mock.com/v2/magicwords'
            );
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            console.log('Received data:', data);
            console.log('Data structure:', {
                hasDialogue: Array.isArray(data?.dialogue),
                hasEmojies: Array.isArray(data?.emojies),
                hasAvatars: Array.isArray(data?.avatars),
                dialogueLength: data?.dialogue?.length,
                emojiesLength: data?.emojies?.length,
                avatarsLength: data?.avatars?.length,
            });

            if (!this.isValidDialogueData(data)) {
                throw new Error('Invalid dialogue data format');
            }

            this.dialogueData = data;
            await this.preloadAssets();
            this.isLoading = false;
            this.removeChild(this.loadingText);
            this.setupUI();
            this.showCurrentLine();
        } catch (error) {
            console.error('Failed to fetch dialogue data:', error);
            const errorText = new PIXI.Text('Failed to load dialogue.\nPlease try again later.', {
                fontFamily: 'Arial',
                fontSize: 24,
                fill: 0xff0000,
                align: 'center',
            });
            errorText.anchor.set(0.5);
            errorText.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
            this.addChild(errorText);
        }
    }

    private async preloadAssets(): Promise<void> {
        if (!this.dialogueData) return;

        const totalAssets = this.dialogueData.emojies.length + this.dialogueData.avatars.length;
        let loadedAssets = 0;

        // Update loading text to show progress
        const updateLoadingProgress = () => {
            const progress = Math.round((loadedAssets / totalAssets) * 100);
            this.loadingText.text = `Loading... ${progress}%`;
        };

        // Preload emojis
        for (const emoji of this.dialogueData.emojies) {
            try {
                // Check if texture is already loaded
                const existingTexture = PIXI.Texture.from(emoji.url);
                if (existingTexture.valid) {
                    emoji.texture = existingTexture;
                } else {
                    const texture = await PIXI.Texture.fromURL(emoji.url);
                    emoji.texture = texture;
                }
                loadedAssets++;
                updateLoadingProgress();
            } catch (error) {
                console.error(`Failed to load emoji ${emoji.name}:`, error);
                // Retry once after a short delay
                try {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const texture = await PIXI.Texture.fromURL(emoji.url);
                    emoji.texture = texture;
                    loadedAssets++;
                    updateLoadingProgress();
                } catch (retryError) {
                    console.error(`Failed to load emoji ${emoji.name} after retry:`, retryError);
                }
            }
        }

        // Preload avatars
        for (const avatar of this.dialogueData.avatars) {
            try {
                // Check if texture is already loaded
                const existingTexture = PIXI.Texture.from(avatar.url);
                if (existingTexture.valid) {
                    avatar.texture = existingTexture;
                } else {
                    const texture = await PIXI.Texture.fromURL(avatar.url);
                    avatar.texture = texture;
                }

                // Create sprite only if texture was loaded successfully
                if (avatar.texture) {
                    const sprite = new PIXI.Sprite(avatar.texture);
                    sprite.anchor.set(0.5);
                    sprite.scale.set(0.5); // Adjust scale as needed
                    this.avatarSprites.set(avatar.name, sprite);
                }
                loadedAssets++;
                updateLoadingProgress();
            } catch (error) {
                console.error(`Failed to load avatar ${avatar.name}:`, error);
                // Retry once after a short delay
                try {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    const texture = await PIXI.Texture.fromURL(avatar.url);
                    avatar.texture = texture;
                    if (avatar.texture) {
                        const sprite = new PIXI.Sprite(avatar.texture);
                        sprite.anchor.set(0.5);
                        sprite.scale.set(0.5);
                        this.avatarSprites.set(avatar.name, sprite);
                    }
                    loadedAssets++;
                    updateLoadingProgress();
                } catch (retryError) {
                    console.error(`Failed to load avatar ${avatar.name} after retry:`, retryError);
                }
            }
        }
    }

    private isValidDialogueData(data: unknown): data is DialogueData {
        if (!data || typeof data !== 'object') return false;

        const d = data as Record<string, unknown>;

        if (!Array.isArray(d.dialogue) || !Array.isArray(d.emojies) || !Array.isArray(d.avatars)) {
            return false;
        }

        return (
            d.dialogue.every((line: unknown) => {
                if (typeof line !== 'object' || !line) return false;
                const l = line as Record<string, unknown>;
                return typeof l.name === 'string' && typeof l.text === 'string';
            }) &&
            d.emojies.every((emoji: unknown) => {
                if (typeof emoji !== 'object' || !emoji) return false;
                const e = emoji as Record<string, unknown>;
                return typeof e.name === 'string' && typeof e.url === 'string';
            }) &&
            d.avatars.every((avatar: unknown) => {
                if (typeof avatar !== 'object' || !avatar) return false;
                const a = avatar as Record<string, unknown>;
                return (
                    typeof a.name === 'string' &&
                    typeof a.url === 'string' &&
                    (a.position === 'left' || a.position === 'right')
                );
            })
        );
    }

    private setupUI(): void {
        // Create dialogue box
        const isMobile = this.app.screen.width <= 768; // Common mobile breakpoint
        const boxWidth = isMobile ? this.app.screen.width * 0.95 : this.app.screen.width * 0.4;
        const boxHeight = this.app.screen.height * 0.3;
        const boxX = (this.app.screen.width - boxWidth) / 2;
        // Position box higher above the character
        const characterHeight = isMobile
            ? this.app.screen.width * 0.2
            : this.app.screen.width * 0.1;
        const boxY = this.app.screen.height - characterHeight - boxHeight - 60;

        const box = new PIXI.Graphics();
        box.beginFill(0xffffff, 0.95); // White color with slight transparency
        box.drawRoundedRect(boxX, boxY, boxWidth, boxHeight, 15);
        box.endFill();
        this.addChild(box);

        // Create speaker name text
        this.speakerName = new PIXI.Text('', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0x333333,
            fontWeight: 'bold',
        });
        this.speakerName.position.set(boxX + 20, boxY + 20);
        this.addChild(this.speakerName);

        // Position continue button
        this.continueButton.position.set(boxX + boxWidth - 140, boxY + boxHeight - 60);
        this.continueButton.setVisible(false);
        this.addChild(this.continueButton);

        // Position restart button
        this.restartButton.position.set(boxX + boxWidth - 140, boxY + boxHeight - 60);
        this.addChild(this.restartButton);

        // Position the dialogue container (added last to appear on top)
        this.dialogueContainer.position.set(boxX + 20, boxY + 60);
        this.addChild(this.dialogueContainer);
    }

    private updateAvatar(speakerName: string): void {
        // Remove current avatar if it exists
        if (this.currentAvatar) {
            this.removeChild(this.currentAvatar);
            this.currentAvatar.destroy();
            this.currentAvatar = null;
        }

        // Get the new avatar sprite
        const newAvatar = this.avatarSprites.get(speakerName);
        if (newAvatar) {
            // Create a new sprite instance to avoid scaling issues
            const sprite = new PIXI.Sprite(newAvatar.texture);

            // Calculate size based on screen width (10% on mobile, 5% on desktop)
            const isMobile = this.app.screen.width <= 768;
            const targetWidth = isMobile
                ? this.app.screen.width * 0.3
                : this.app.screen.width * 0.1;
            const scale = targetWidth / sprite.width;
            sprite.scale.set(scale);

            // Get the avatar's position from the dialogue data
            const avatarData = this.dialogueData?.avatars.find(a => a.name === speakerName);
            const position = avatarData?.position || 'left';

            // Position the avatar based on the position property
            const horizontalOffset = this.app.screen.width * (isMobile ? 0.2 : 0.35);
            const xPosition =
                position === 'left' ? horizontalOffset : this.app.screen.width - horizontalOffset;

            sprite.position.set(
                xPosition,
                this.app.screen.height // Bottom of screen
            );
            sprite.anchor.set(0.5, 1); // Anchor at bottom center

            this.addChild(sprite);
            this.currentAvatar = sprite;
        }
    }

    private showCurrentLine(): void {
        if (!this.dialogueData || this.currentLineIndex >= this.dialogueData.dialogue.length) {
            this.dialogueText.text = 'End of dialogue';
            this.speakerName.text = '';
            this.continueButton.setVisible(false);
            this.restartButton.setVisible(true);
            if (this.currentAvatar) {
                this.removeChild(this.currentAvatar);
                this.currentAvatar = null;
            }
            return;
        }

        const currentLine = this.dialogueData.dialogue[this.currentLineIndex];
        this.speakerName.text = currentLine.name;
        this.continueButton.setVisible(false);
        this.restartButton.setVisible(false);
        this.isAnimating = true;
        this.currentCharIndex = 0;

        // Update avatar for current speaker
        this.updateAvatar(currentLine.name);

        // Parse text and emojis
        const { text, emojis } = this.parseTextWithEmojis(currentLine.text);
        this.animateText(text, emojis);
    }

    private parseTextWithEmojis(text: string): {
        text: string;
        emojis: { name: string; index: number }[];
    } {
        const emojiRegex = /{([^}]+)}/g;
        const emojis: { name: string; index: number }[] = [];
        let match;
        let lastIndex = 0;
        let parsedText = '';

        while ((match = emojiRegex.exec(text)) !== null) {
            const emojiName = match[1];
            parsedText += text.slice(lastIndex, match.index) + '  '; // Just add two spaces
            emojis.push({ name: emojiName, index: parsedText.length - 1 }); // Position at the end of spaces
            lastIndex = match.index + match[0].length;
        }
        parsedText += text.slice(lastIndex);

        return { text: parsedText, emojis };
    }

    private animateText(text: string, emojis: { name: string; index: number }[]): void {
        let currentIndex = 0;
        this.clearDialogueContainer();

        const animate = () => {
            if (currentIndex < text.length) {
                const currentChar = text[currentIndex];
                const emojiToAdd = emojis.find(e => e.index === currentIndex);

                if (emojiToAdd) {
                    this.addEmoji(emojiToAdd.name);
                } else {
                    this.addCharacter(currentChar);
                }

                currentIndex++;
                setTimeout(animate, 10);
            } else {
                this.isAnimating = false;
                this.continueButton.setVisible(true);
            }
        };

        animate();
    }

    private clearDialogueContainer(): void {
        this.dialogueContainer.removeChildren();
        this.charSprites = [];
        this.emojiSprites.clear();
    }

    private addCharacter(char: string): void {
        const charText = new PIXI.Text(char, {
            fontFamily: 'Arial',
            fontSize: 20,
            fill: 0x333333,
        });

        const lastChar = this.charSprites[this.charSprites.length - 1];
        let x = 0;
        let y = 0;

        if (lastChar) {
            x = lastChar.x + lastChar.width + this.CHAR_SPACING;
            y = lastChar.y;

            // Check if we need to wrap to next line
            if (x + charText.width > this.maxLineWidth) {
                // If we're in the middle of a word (not a space), move the whole word to the next line
                if (char !== ' ') {
                    // Store the Y position before removing characters
                    const currentY = lastChar.y;

                    // Find the start of the current word
                    let wordStartIndex = this.charSprites.length - 1;
                    while (
                        wordStartIndex > 0 &&
                        this.charSprites[wordStartIndex - 1].text !== ' '
                    ) {
                        wordStartIndex--;
                    }

                    // Store the current word's characters
                    const wordChars = this.charSprites.slice(wordStartIndex);
                    const wordText = wordChars.map(c => c.text).join('');

                    // Remove all characters of the current word
                    for (let i = this.charSprites.length - 1; i >= wordStartIndex; i--) {
                        const sprite = this.charSprites.pop();
                        if (sprite) {
                            sprite.destroy();
                        }
                    }

                    // Move to new line
                    x = 0;
                    y = currentY + this.LINE_HEIGHT;

                    // Add the word back at the new position
                    const wordSprite = new PIXI.Text(wordText, {
                        fontFamily: 'Arial',
                        fontSize: 20,
                        fill: 0x333333,
                    });
                    wordSprite.position.set(x, y);
                    this.dialogueContainer.addChild(wordSprite);
                    this.charSprites.push(wordSprite);
                    x = wordSprite.width + this.CHAR_SPACING;
                } else {
                    x = 0;
                    y = lastChar.y + this.LINE_HEIGHT;
                }
            }
        }

        charText.position.set(x, y);
        this.dialogueContainer.addChild(charText);
        this.charSprites.push(charText);
    }

    private addEmoji(emojiName: string): void {
        const emoji = this.dialogueData?.emojies.find(e => e.name === emojiName);
        if (!emoji?.texture) return;

        const sprite = new PIXI.Sprite(emoji.texture);
        const textHeight = 20; // Match font size
        sprite.scale.set((textHeight / sprite.height) * 1.2);

        const lastChar = this.charSprites[this.charSprites.length - 1];
        let x = 0;
        let y = 0;

        if (lastChar) {
            x = lastChar.x + lastChar.width + this.EMOJI_SPACING;
            y = lastChar.y;

            // Check if we need to wrap to next line
            if (x + sprite.width > this.maxLineWidth) {
                x = 0;
                y = lastChar.y + this.LINE_HEIGHT;
            }
        }

        sprite.position.set(x, y + (this.LINE_HEIGHT - sprite.height) / 2);
        this.dialogueContainer.addChild(sprite);
        this.emojiSprites.set(emojiName, sprite);

        // Add a space after the emoji
        this.addCharacter(' ');
    }

    private onContinueClick(): void {
        this.nextLine();
    }

    private restartDialogue(): void {
        // Reset all state
        this.currentLineIndex = 0;
        this.isAnimating = false;
        this.currentCharIndex = 0;

        // Clean up emoji sprites
        this.emojiSprites.forEach(sprite => {
            if (sprite.parent) {
                sprite.parent.removeChild(sprite);
            }
            sprite.destroy();
        });
        this.emojiSprites.clear();

        // Hide restart button and show continue button
        this.restartButton.setVisible(false);
        this.continueButton.setVisible(false);

        // Start the dialogue from the beginning
        this.showCurrentLine();
    }

    private nextLine(): void {
        if (!this.dialogueData) return;

        // Clean up previous emoji sprites
        this.emojiSprites.forEach(sprite => {
            if (sprite.parent) {
                sprite.parent.removeChild(sprite);
            }
            sprite.destroy();
        });
        this.emojiSprites.clear();

        this.currentLineIndex++;
        if (this.currentLineIndex < this.dialogueData.dialogue.length) {
            this.startNewLine();
        } else {
            this.dialogueText.text = 'End of dialogue';
            this.speakerName.text = '';
            this.continueButton.setVisible(false);
            this.restartButton.setVisible(true);
            if (this.currentAvatar) {
                this.removeChild(this.currentAvatar);
                this.currentAvatar = null;
            }
        }
    }

    private startNewLine(): void {
        if (!this.dialogueData) return;

        const line = this.dialogueData.dialogue[this.currentLineIndex];
        this.speakerName.text = line.name;
        this.dialogueText.text = '';
        this.isAnimating = true;
        this.currentCharIndex = 0;
        this.continueButton.setVisible(false);
        this.restartButton.setVisible(false);

        // Update avatar for current speaker
        this.updateAvatar(line.name);

        // Parse and animate the new line
        const { text, emojis } = this.parseTextWithEmojis(line.text);
        this.animateText(text, emojis);
    }

    public update(): void {
        if (this.isLoading) return;

        if (this.isAnimating && this.dialogueData) {
            const line = this.dialogueData.dialogue[this.currentLineIndex];
            const { text, emojis } = this.parseTextWithEmojis(line.text);

            if (this.currentCharIndex < text.length) {
                this.dialogueText.text += text[this.currentCharIndex];

                // Check if we need to add an emoji
                const emojiToAdd = emojis.find(e => e.index === this.currentCharIndex);
                if (emojiToAdd) {
                    const emoji = this.dialogueData.emojies.find(e => e.name === emojiToAdd.name);
                    if (emoji?.texture) {
                        const sprite = new PIXI.Sprite(emoji.texture);
                        const textHeight = Number(this.dialogueText.style.fontSize || 16);
                        sprite.scale.set((textHeight / Number(sprite.height)) * 1.2); // Scale emoji to be 1.2x text height
                        sprite.position.set(
                            this.dialogueText.x + this.dialogueText.width + 10, // More spacing
                            this.dialogueText.y + textHeight / 2 - textHeight * 0.5 // Raise by 50% of text height
                        );
                        this.addChild(sprite);
                        this.emojiSprites.set(emojiToAdd.name, sprite);
                    }
                }

                this.currentCharIndex++;
            } else {
                this.isAnimating = false;
                this.continueButton.setVisible(true);
            }
        }
    }

    public destroy(): void {
        // Clean up emoji sprites
        this.emojiSprites.forEach(sprite => {
            if (sprite.parent) {
                sprite.parent.removeChild(sprite);
            }
            sprite.destroy();
        });
        this.emojiSprites.clear();

        // Clean up avatar sprites
        this.avatarSprites.forEach(sprite => {
            if (sprite.parent) {
                sprite.parent.removeChild(sprite);
            }
            sprite.destroy();
        });
        this.avatarSprites.clear();

        super.destroy({ children: true });
    }

    public handleResize(): void {
        // Calculate positions based on screen dimensions
        const isMobile = this.app.screen.width <= 768;
        const boxWidth = isMobile ? this.app.screen.width * 0.95 : this.app.screen.width * 0.4;
        const boxHeight = this.app.screen.height * 0.3;
        const boxX = (this.app.screen.width - boxWidth) / 2;
        const characterHeight = isMobile ? this.app.screen.width * 0.2 : this.app.screen.width * 0.1;
        const boxY = this.app.screen.height - characterHeight - boxHeight - 60;

        // Update white textbox
        const box = this.children.find(child => child instanceof PIXI.Graphics) as PIXI.Graphics;
        if (box) {
            box.clear();
            box.beginFill(0xffffff, 0.95);
            box.drawRoundedRect(boxX, boxY, boxWidth, boxHeight, 15);
            box.endFill();
        }

        // Update dialogue container position relative to the textbox
        this.dialogueContainer.position.set(boxX + 20, boxY + 60);

        // Update speaker name position relative to the textbox
        this.speakerName.position.set(boxX + 20, boxY + 20);

        // Update continue button position relative to the textbox
        this.continueButton.position.set(boxX + boxWidth - 140, boxY + boxHeight - 60);

        // Update restart button position relative to the textbox
        this.restartButton.position.set(boxX + boxWidth - 140, boxY + boxHeight - 60);

        // Update avatar position
        if (this.currentAvatar) {
            const horizontalOffset = this.app.screen.width * (isMobile ? 0.2 : 0.35);
            const xPosition = this.currentAvatar.anchor.x === 0.5 ? 
                horizontalOffset : 
                this.app.screen.width - horizontalOffset;
            this.currentAvatar.position.set(xPosition, this.app.screen.height);
        }
    }
}
