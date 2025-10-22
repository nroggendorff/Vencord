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
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={enabled ? "var(--status-danger)" : "hsla(0, 0%, 100%, 0.9)"}
      stroke={enabled ? "var(--status-danger)" : "hsla(0, 0%, 100%, 0.9)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`micButtonParent__37e49${enabled ? "" : " hasColorGlow__37e49"}`}
    >
      <defs>
        <mask id="lineMask">
          <rect width="100%" height="100%" fill="white" />
          {enabled && (
            <line
              x1="1"
              y1="1"
              x2="23"
              y2="23"
              transform="scale(-1, 1) translate(-24, -1)"
              stroke="black"
              strokeWidth="6"
              strokeLinecap="round"
            />
          )}
        </mask>
      </defs>
      <g mask="url(#lineMask)" transform="translate(0, 1)">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </g>
      {enabled && (
        <line
          x1="1"
          y1="1"
          x2="23"
          y2="23"
          strokeWidth="2"
          transform="scale(-1, 1) translate(-24, 0)"
        />
      )}
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
      className={`button__67645 micButtonWithMenu__37e49 enabled__67645 plated__67645 button__201d5 lookBlank__201d5 colorBrand__201d5 grow__201d5 ${enabled ? "redGlow__67645 plateMuted__67645" : ""
        }`}
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
    const GatewayConnection = findByProps(
      "voiceStateUpdate",
      "voiceServerPing"
    );
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
