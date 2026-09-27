import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { caminhoSeguro, codificar, idiomaPeloNome, lerNome, srtParaVtt } from '@/lib/biblioteca';

describe('lerNome: nome de arquivo baixado vira título', () => {
  it.each([
    ['Duna.Parte.Dois.2024.1080p.WEB-DL.mkv', 'Duna Parte Dois', 2024, null, null],
    ['Sintel.2010.1080p.Dublado.mp4', 'Sintel', 2010, null, null],
    ['O Auto da Compadecida (2000).mp4', 'O Auto da Compadecida', 2000, null, null],
    ['Breaking.Bad.S01E02.720p.mp4', 'Breaking Bad', null, 1, 2],
    ['The Office 3x07.mkv', 'The Office', null, 3, 7],
    ['Video da festa da familia.mp4', 'Video da festa da familia', null, null, null],
    ['Blade.Runner.2049.2017.4K.HDR.mkv', 'Blade Runner 2049', 2017, null, null],
  ])('%s', (arquivo, nome, ano, temporada, episodio) => {
    expect(lerNome(arquivo)).toEqual({ nome, ano, temporada, episodio });
  });

  it('não confunde ano no começo do nome com ano de lançamento', () => {
    expect(lerNome('1917.2019.mp4')).toMatchObject({ nome: '1917', ano: 2019 });
  });
});

describe('idiomaPeloNome', () => {
  it('reconhece dublado pelo nome', () => {
    expect(idiomaPeloNome('Filme 2020 Dublado', false)).toBe('dublado');
    expect(idiomaPeloNome('Filme 2020 DUAL', false)).toBe('dublado');
  });
  it('legenda ao lado do arquivo conta como legendado', () => {
    expect(idiomaPeloNome('Filme 2020', true)).toBe('legendado');
    expect(idiomaPeloNome('Filme 2020 Legendado', false)).toBe('legendado');
  });
  it('sem pista nenhuma, não inventa', () => {
    expect(idiomaPeloNome('Filme 2020', false)).toBeNull();
  });
  it('dublado ganha de legenda ao lado', () => {
    expect(idiomaPeloNome('Filme Dublado', true)).toBe('dublado');
  });
});

describe('srtParaVtt', () => {
  it('troca vírgula por ponto no tempo e põe o cabeçalho', () => {
    const vtt = srtParaVtt('﻿1\r\n00:00:01,500 --> 00:00:03,250\r\nOlá, mundo\r\n');
    expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
    expect(vtt).toContain('00:00:01.500 --> 00:00:03.250');
    expect(vtt).not.toContain('\r');
    expect(vtt).not.toContain('﻿');
  });
  it('não mexe em vírgula do texto da legenda', () => {
    expect(srtParaVtt('1\n00:00:01,000 --> 00:00:02,000\nSim, claro\n')).toContain('Sim, claro');
  });
});

describe('caminhoSeguro: ninguém sai da pasta de vídeos', () => {
  let pasta: string;
  const anterior = process.env.BIBLIOTECA_DIR;

  beforeEach(() => {
    pasta = mkdtempSync(path.join(tmpdir(), 'outorga-'));
    mkdirSync(path.join(pasta, 'Series'));
    writeFileSync(path.join(pasta, 'Series', 'ep.mp4'), 'x');
    process.env.BIBLIOTECA_DIR = pasta;
  });
  afterEach(() => {
    process.env.BIBLIOTECA_DIR = anterior;
  });

  it('aceita vídeo de dentro da pasta', () => {
    expect(caminhoSeguro(codificar(path.join('Series', 'ep.mp4')))).toBe(path.join(pasta, 'Series', 'ep.mp4'));
  });

  it.each([
    ['subir de pasta', '../../Windows/win.ini'],
    ['subir e voltar com extensão de vídeo', '../fora.mp4'],
    ['caminho absoluto', path.join(tmpdir(), 'x.mp4')],
    ['arquivo que não é vídeo', 'Series/.env'],
    ['a própria pasta', '.'],
  ])('recusa %s', (_caso, relativo) => {
    expect(caminhoSeguro(codificar(relativo))).toBeNull();
  });

  it('recusa id com caractere fora do base64url', () => {
    expect(caminhoSeguro('abc/../def')).toBeNull();
    expect(caminhoSeguro('abc%2F')).toBeNull();
  });

  it('sem pasta configurada, nada é servido', () => {
    process.env.BIBLIOTECA_DIR = '';
    expect(caminhoSeguro(codificar('Series/ep.mp4'))).toBeNull();
  });
});
