import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { findByProps, findComponentByCodeLazy } from "@webpack";
import { React } from "@webpack/common";
import { localStorage } from "@utils/localStorage";

let originalVoiceStateUpdate: any;
let unpatchVoiceState: (() => void) | null = null;

const Button = findComponentByCodeLazy(".NONE,disabled:", ".PANEL_BUTTON");

function setDupeState(enabled: boolean) {
  localStorage.setItem("DupeDeafenEnabled", String(enabled));
}
function getDupeState(): boolean {
  return localStorage.getItem("DupeDeafenEnabled") === "true";
}

function DupeDeafenIcon({ enabled }: { enabled: boolean; }) {
  return (
    <svg
      width="24"
      height="24"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 595.28 841.89"
      display="block"
      fill={enabled ? "#f00" : "#fff"}
    >
      <path
        d="M349.68,728.14c-17.27-4.44-29.62-17.39-32.17-35.29l-.06-393.64c33.85-187.71,290.19-159.69,277.36,42.18-5.06,79.61-79.29,140.06-158.49,128.06v225.89c0,1.3-3.53,9.76-4.47,11.62-5.78,11.4-15.87,17.47-27.71,21.18h-54.46ZM396.71,411.28c52.32,39.15,127.99,17.31,151.6-43.34,30.74-78.98-26.69-173.49-116.73-151.39-35.25,8.65-74.48,47.18-74.48,85.19v317.49h39.61v-207.95ZM396.71,658.83h-39.61v29.71h39.61v-29.71Z"
      />
      <path
        d="M159.06,410.04C79.85,422.02,5.49,361.86.57,281.99c-3.27-53.1,6.85-100.27,48.99-135.56,88.42-74.05,221.57-14.35,228.38,99.55l-.61,390.63c-3.37,16.82-17.35,30.38-34.73,32.11-12.46,1.24-48.28,1.36-59.12-2.74-10.09-3.82-24.42-19.04-24.42-30.05v-225.89ZM77.37,174.88c-1.19,1.73,8.13,3.98,9.51,4.71,18.7,9.9,31.15,29.09,32.63,50.3,1.26,18.05,2.05,66.7-3.18,82.34-5.97,17.84-21.95,31.07-38.94,37.78,44.7,35.97,110.84,25.38,143.33-21.27,15.73-22.59,19.24-49.47,17.61-76.56-5.08-84.4-92.02-126.05-160.96-77.29ZM55.98,213.52c-2.31.47-7.89,3.51-9.4,5.45-8.54,10.99-7.19,58.25-4.56,72.31,1.54,8.24,3.01,17.51,12.03,20.14,11.7,3.42,23.48-4.18,25.49-16.17,1.92-11.45,1.65-50.77.3-62.84s-11.57-21.42-23.86-18.9ZM238.28,559.81v-189.38c-11.97,10.72-24.75,20.74-39.61,27.23v162.15h39.61ZM238.28,599.42h-39.61v29.71h39.61v-29.71Z"
      />

      <path
        transform="translate(0, 150)"
        opacity={enabled ? "1" : "0"}
        d="M30.46,598.3c-3.73,0-7.23-1.45-9.86-4.09l-13.95-13.95c-2.63-2.63-4.09-6.14-4.09-9.86s1.45-7.23,4.09-9.86L535.68,31.52c2.63-2.63,6.14-4.08,9.86-4.08s7.23,1.45,9.86,4.08l13.95,13.95c2.63,2.63,4.09,6.14,4.09,9.86s-1.45,7.23-4.09,9.86L40.32,594.22c-2.63,2.63-6.14,4.09-9.86,4.09Z"
      />
    </svg>
  );
}

function DupeDeafenButton() {
  const [enabled, setEnabled] = React.useState(getDupeState);

  const toggle = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    setDupeState(newEnabled);

    const ChannelStore = findByProps("getChannel", "getDMFromUserId");
    const SelectedChannelStore = findByProps("getVoiceChannelId");
    const GatewayConnection = findByProps(
      "voiceStateUpdate",
      "voiceServerPing"
    );
    const MediaEngineStore = findByProps("isDeaf", "isMute");
    if (
      ChannelStore &&
      SelectedChannelStore &&
      GatewayConnection &&
      typeof GatewayConnection.voiceStateUpdate === "function"
    ) {
      const channelId = SelectedChannelStore.getVoiceChannelId?.();
      const channel = channelId
        ? ChannelStore.getChannel?.(channelId)
        : null;
      if (channel) {
        if (newEnabled) {
          GatewayConnection.voiceStateUpdate({
            channelId: channel.id,
            guildId: channel.guild_id,
            selfMute: true,
            selfDeaf: true,
          });
        } else {
          const selfMute = MediaEngineStore?.isMute?.() ?? false;
          const selfDeaf = MediaEngineStore?.isDeaf?.() ?? false;
          GatewayConnection.voiceStateUpdate({
            channelId: channel.id,
            guildId: channel.guild_id,
            selfMute,
            selfDeaf,
          });
        }
      }
    }
  };

  return (
    <Button
      className="dupe-hover"
      tooltipText={enabled ? "Undupe Deafen" : "Dupe Deafen"}
      icon={() => <DupeDeafenIcon enabled={enabled} />}
      role="switch"
      aria-checked={enabled}
      selected={enabled}
      onClick={toggle}
    />
  );
}

export default definePlugin({
  name: "DupeDeafen",
  description:
    "Toggle a false-deafen mode in which others see you as deafened, but you can still hear and speak. If you wish to be unheard, use the 'Mute' button in addition to 'Dupe Deafen'.",
  authors: [Devs.Noa],
  patches: [
    {
      find: "#{intl::ACCOUNT_SPEAKING_WHILE_MUTED}",
      replacement: {
        match: /className:\i\.buttons,.{0,50}children:\[/,
        replace: "$&$self.DupeDeafenButton(),",
      },
    },
  ],
  DupeDeafenButton,
  start() {
    const GatewayConnection = findByProps("voiceStateUpdate", "voiceServerPing");
    if (!GatewayConnection) return;

    originalVoiceStateUpdate = GatewayConnection.voiceStateUpdate;

    GatewayConnection.voiceStateUpdate = function (args) {
      if (getDupeState()) {
        args.selfMute = true;
        args.selfDeaf = true;
      }
      return originalVoiceStateUpdate.apply(this, arguments);
    };

    unpatchVoiceState = () => {
      GatewayConnection.voiceStateUpdate = originalVoiceStateUpdate;
    };
  },

  stop() {
    unpatchVoiceState?.();
    unpatchVoiceState = null;
  },
});
