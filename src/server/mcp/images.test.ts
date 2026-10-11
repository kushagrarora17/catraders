import { describe, expect, test } from "bun:test";
import { isPrivateAddress } from "./images";

describe("isPrivateAddress", () => {
  test("flags non-routable IPv4 ranges", () => {
    for (const ip of [
      "0.0.0.0",
      "10.1.2.3",
      "127.0.0.1",
      "100.64.0.1",
      "169.254.169.254",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "224.0.0.1",
      "255.255.255.255",
    ]) {
      expect(isPrivateAddress(ip)).toBe(true);
    }
  });

  test("allows public IPv4 addresses, including near-misses of private ranges", () => {
    for (const ip of ["8.8.8.8", "172.15.0.1", "172.32.0.1", "100.63.0.1", "100.128.0.1", "169.253.0.1"]) {
      expect(isPrivateAddress(ip)).toBe(false);
    }
  });

  test("flags loopback, unique-local, link-local and mapped-private IPv6", () => {
    for (const ip of ["::", "::1", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1", "::ffff:10.0.0.1", "::ffff:127.0.0.1"]) {
      expect(isPrivateAddress(ip)).toBe(true);
    }
  });

  test("allows public IPv6 and mapped-public addresses", () => {
    expect(isPrivateAddress("2606:4700:4700::1111")).toBe(false);
    expect(isPrivateAddress("::ffff:8.8.8.8")).toBe(false);
  });

  test("treats anything that isn't an IP as unsafe", () => {
    expect(isPrivateAddress("localhost")).toBe(true);
  });
});
