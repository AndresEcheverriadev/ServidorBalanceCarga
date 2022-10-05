const clusterword = "CLUSTER";

module.exports = {
  apps: [
    {
      name: "server1",
      script: "server.js",
      watch: true,
      node_args: "--expose-gc",
    },
    {
      name: "server2",
      script: "server.js",
      watch: true,
      args: "-p 8081",
      node_args: "--expose-gc",
    },
    {
      name: "server3",
      script: "server.js",
      watch: true,
      args: `-p 8082 -m ${clusterword}`,
      exec_mode: clusterword === "CLUSTER" ? "cluster" : "fork",
      instances: clusterword === "CLUSTER" ? "max" : null,
      node_args: "--harmony --expose-gc",
    },
  ],
};
