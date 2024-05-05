import test from "ava";

async function allDatabases(t, title, exec) {

  t.context.master = "LEVEL";
  await exec(t);

  t.context.master = "POSTGRES";
  await exec(t);
}

allDatabases.title = (providedTitle = "databases", ) =>
    `${providedTitle}`.trim();
  
test(allDatabases,"list categories", async t => {
    t.log(t.context.master);
  t.true(t.context.master === "LEVEL" ||t.context.master === "POSTGRES");
});
