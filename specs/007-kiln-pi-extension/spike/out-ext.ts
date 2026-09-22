// THROWAWAY spike extension (T010). Writes to every output channel an extension has, so the driver can see where each one lands. Not part of KILN.
export default function (pi: any) {
  pi.registerCommand("o-out", {
    description: "write to console.log, process.stdout, console.error",
    handler: async (_a: string, ctx: any) => {
      console.log("VIA_CONSOLE_LOG");
      process.stdout.write("VIA_STDOUT_WRITE\n");
      console.error("VIA_CONSOLE_ERROR");
      ctx.ui.notify("VIA_NOTIFY", "info");
    },
  });
}
