import {expect} from 'chai'
import { Contract } from 'ethers';
import {ethers, upgrades} from 'hardhat'

describe('ReceiptRenderer Contract', async () => {
  let ReceiptRenderer: Contract,
  deployedReceiptRenderer: Contract

  const wrappedEthAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  const tokenId = 100
  const questId = "questid123"
  const totalParticipants = 500
  const claimed = true
  const rewardAmount = 1000

  beforeEach(async () => {
    ReceiptRenderer = await ethers.getContractFactory('ReceiptRenderer')

    deployedReceiptRenderer = await ReceiptRenderer.deploy()
    await deployedReceiptRenderer.deployed()
  })

  describe('generateTextFields', () => {
    it('generates the correct text fields', async () => {
      let textFields = await deployedReceiptRenderer.generateTextFields(claimed, questId, rewardAmount, wrappedEthAddress);
      expect(textFields).to.equal('<g filter="url(#E)" class="I"><text fill="#0f0f16" xml:space="preserve" style="white-space:pre" font-size="26" font-weight="bold" letter-spacing="0.07em"><tspan y="750" x="325" class="J">CLAIMED</tspan></text></g><g filter="url(#F)" class="H I J L"><text font-size="26" letter-spacing="0em" x="50%" y="615"><tspan>RabbitHole</tspan></text></g><g filter="url(#G)" class="H I J L"><text font-size="39.758" letter-spacing="0.05em" x="50%" y="365"> 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2</text></g>')
    })
  })

  describe('humanRewardAmount', () => {
    it('generates the reward amount and symbol text', async () => {
      let rewardAmountText = await deployedReceiptRenderer.humanRewardAmount(ethers.BigNumber.from("100000000000000000"), wrappedEthAddress);
      expect(rewardAmountText).to.equal("0.1")
    })
  })

  describe('symbolForAddress', () => {
    it('generates the correct symbol for the address', async () => {
      let symbol = await deployedReceiptRenderer.symbolForAddress(wrappedEthAddress);
      expect(symbol).to.equal("WETH")
    })
  })

  describe('generateTokenURI', () => {
    it('has the correct metadata', async () => {
      let base64encoded = await deployedReceiptRenderer.generateTokenURI(tokenId, questId, totalParticipants, claimed, rewardAmount, wrappedEthAddress);

      let buff = Buffer.from(base64encoded.replace("data:application/json;base64,", ""), 'base64');
      let metadata = buff.toString('ascii');

      let expectedMetada = {
        "name": "RabbitHole.gg Receipt #100",
        "description": "RabbitHole.gg Receipts are used to claim rewards from completed quests.",
        "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iNjQ4IiBoZWlnaHQ9Ijg4OSIgZmlsbD0ibm9uZSI+PHN0eWxlPjwhW0NEQVRBWy5Ce2ZpbGwtcnVsZTpldmVub2RkfS5De2NvbG9yLWludGVycG9sYXRpb24tZmlsdGVyczpzUkdCfS5Ee2Zsb29kLW9wYWNpdHk6MH0uRXtmaWxsLW9wYWNpdHk6LjV9LkZ7c3Ryb2tlOiNhZDg2ZmZ9Lkd7c3Ryb2tlLXdpZHRoOjJ9Lkh7ZmlsbDojZGFlMGZmfS5Je2ZvbnQtZmFtaWx5OkFyaWFsfS5Ke3RleHQtYW5jaG9yOm1pZGRsZX0uS3tzaGFwZS1yZW5kZXJpbmc6Y3Jpc3BFZGdlc30uTHtkb21pbmFudC1iYXNlbGluZTptaWRkbGV9XV0+PC9zdHlsZT48ZyBmaWx0ZXI9InVybCgjQikiPjxwYXRoIGQ9Ik05MS43MzEgNDQuMTk1Yy0yNS45NTcgMC00NyAyMS4wNDMtNDcgNDd2MTE0YzAgMjUuOTU4IDIxLjA0MyA0NyA0NyA0N0gyMjAuMjN2Mzg0SDkxLjczMWMtMjUuOTU3IDAtNDcgMjEuMDQzLTQ3IDQ3djExNGMwIDI1Ljk1OCAyMS4wNDMgNDcgNDcgNDdoNDY1YzI1Ljk1OCAwIDQ3LTIxLjA0MiA0Ny00N3YtMTE0YzAtMjUuOTU3LTIxLjA0Mi00Ny00Ny00N2gtMTI4LjV2LTM4NGgxMjguNWMyNS45NTggMCA0Ny0yMS4wNDIgNDctNDd2LTExNGMwLTI1Ljk1Ny0yMS4wNDItNDctNDctNDdIOTEuNzMxeiIgZmlsbD0iIzBmMGYxNiIgY2xhc3M9IkIiLz48cGF0aCBkPSJNMjIwLjczIDI1Mi4xOTV2LS41aC0uNUg5MS43MzFjLTI1LjY4MSAwLTQ2LjUtMjAuODE4LTQ2LjUtNDYuNXYtMTE0YzAtMjUuNjgxIDIwLjgxOS00Ni41IDQ2LjUtNDYuNWg0NjVjMjUuNjgyIDAgNDYuNSAyMC44MTkgNDYuNSA0Ni41djExNGMwIDI1LjY4Mi0yMC44MTggNDYuNS00Ni41IDQ2LjVoLTEyOC41LS41di41IDM4NCAuNWguNSAxMjguNWMyNS42ODIgMCA0Ni41IDIwLjgxOSA0Ni41IDQ2LjV2MTE0YzAgMjUuNjgyLTIwLjgxOCA0Ni41LTQ2LjUgNDYuNUg5MS43MzFjLTI1LjY4MSAwLTQ2LjUtMjAuODE4LTQ2LjUtNDYuNXYtMTE0YzAtMjUuNjgxIDIwLjgxOS00Ni41IDQ2LjUtNDYuNUgyMjAuMjNoLjV2LS41LTM4NHoiIHN0cm9rZT0iIzIzMjg1NCIvPjwvZz48bWFzayBpZD0iQSIgZmlsbD0iI2ZmZiI+PHBhdGggZD0iTTQ0LjczMSA5MS4xOTVjMC0yNS45NTcgMjEuMDQzLTQ3IDQ3LTQ3aDQ2NWMyNS45NTggMCA0NyAyMS4wNDMgNDcgNDd2MTE0YzAgMjEuNDQ4LTE0LjM2NSAzOS41NC0zNCA0NS4xNzl2Mzg3LjY0MmMxOS42MzUgNS42NCAzNCAyMy43MzIgMzQgNDUuMTc5djExNGMwIDI1Ljk1OC0yMS4wNDIgNDctNDcgNDdIOTEuNzMxYy0yNS45NTcgMC00Ny0yMS4wNDItNDctNDd2LTExNGMwLTIxLjgxIDE0Ljg1Ni00MC4xNSAzNS00NS40NTRWMjUwLjY1Yy0yMC4xNDUtNS4zMDQtMzUtMjMuNjQ1LTM1LTQ1LjQ1NXYtMTE0eiIgY2xhc3M9IkIiLz48L21hc2s+PHBhdGggZD0iTTU2OS43MyAyNTAuMzc0bC0uMjc2LS45NjEtLjcyNC4yMDh2Ljc1M2gxem0wIDM4Ny42NDJoLTF2Ljc1NGwuNzI0LjIwNy4yNzYtLjk2MXptLTQ4OS45OTktLjI3NWwuMjU1Ljk2Ny43NDUtLjE5NnYtLjc3MWgtMXptMC0zODcuMDkxaDF2LS43NzFsLS43NDUtLjE5Ny0uMjU1Ljk2OHptMTItMjA3LjQ1NWMtMjYuNTEgMC00OCAyMS40OS00OCA0OGgyYzAtMjUuNDA1IDIwLjU5NS00NiA0Ni00NnYtMnptNDY1IDBIOTEuNzMxdjJoNDY1di0yem00OCA0OGMwLTI2LjUxLTIxLjQ5LTQ4LTQ4LTQ4djJjMjUuNDA2IDAgNDYgMjAuNTk1IDQ2IDQ2aDJ6bTAgMTE0di0xMTRoLTJ2MTE0aDJ6bS0zNC43MjMgNDYuMTRjMjAuMDUxLTUuNzU5IDM0LjcyMy0yNC4yMzQgMzQuNzIzLTQ2LjE0aC0yYzAgMjAuOTktMTQuMDU5IDM4LjY5OS0zMy4yNzYgNDQuMjE4bC41NTMgMS45MjJ6bS43MjMgMzg2LjY4MVYyNTAuMzc0aC0ydjM4Ny42NDJoMnptMzQgNDUuMTc5YzAtMjEuOTA1LTE0LjY3Mi00MC4zODEtMzQuNzIzLTQ2LjE0bC0uNTUzIDEuOTIyYzE5LjIxNyA1LjUyIDMzLjI3NiAyMy4yMjkgMzMuMjc2IDQ0LjIxOGgyem0wIDExNHYtMTE0aC0ydjExNGgyem0tNDggNDhjMjYuNTEgMCA0OC0yMS40OSA0OC00OGgtMmMwIDI1LjQwNS0yMC41OTQgNDYtNDYgNDZ2MnptLTQ2NC45OTkgMGg0NjV2LTJIOTEuNzMxdjJ6bS00OC00OGMwIDI2LjUxIDIxLjQ5IDQ4IDQ4IDQ4di0yYy0yNS40MDUgMC00Ni0yMC41OTUtNDYtNDZoLTJ6bTAtMTE0djExNGgydi0xMTRoLTJ6bTM1Ljc0NS00Ni40MjFjLTIwLjU3MyA1LjQxNy0zNS43NDUgMjQuMTQ2LTM1Ljc0NSA0Ni40MjFoMmMwLTIxLjM0NCAxNC41MzktMzkuMjk2IDM0LjI1NS00NC40ODdsLS41MDktMS45MzR6bS0uNzQ1LTM4Ni4xMjR2Mzg3LjA5MWgyVjI1MC42NWgtMnptLTM1LTQ1LjQ1NWMwIDIyLjI3NiAxNS4xNzMgNDEuMDA1IDM1Ljc0NSA0Ni40MjJsLjUwOS0xLjkzNWMtMTkuNzE2LTUuMTkxLTM0LjI1NS0yMy4xNDItMzQuMjU1LTQ0LjQ4N2gtMnptMC0xMTR2MTE0aDJ2LTExNGgtMnoiIGZpbGw9IiMyMzI4NTQiIG1hc2s9InVybCgjQSkiLz48ZyBmaWx0ZXI9InVybCgjQykiIGNsYXNzPSJCIEsiPjx1c2UgeGxpbms6aHJlZj0iI00iIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iLjAxIi8+PC9nPjx1c2UgeGxpbms6aHJlZj0iI00iIGZpbGw9IiMwYzBiMGYiIGZpbGwtb3BhY2l0eT0iLjI2IiBjbGFzcz0iQiIvPjxnIHN0eWxlPSJtaXgtYmxlbmQtbW9kZTpjb2xvci1kb2RnZSIgZmlsdGVyPSJ1cmwoI0QpIiBjbGFzcz0iQiBLIj48dXNlIHhsaW5rOmhyZWY9IiNNIiBmaWxsPSJ1cmwoI0gpIiBmaWxsLW9wYWNpdHk9Ii45OSIvPjwvZz48dXNlIHhsaW5rOmhyZWY9IiNOIiBmaWxsPSJ1cmwoI0kpIiBzdHlsZT0ibWl4LWJsZW5kLW1vZGU6Y29sb3ItZG9kZ2UiIGNsYXNzPSJFIi8+PHVzZSB4bGluazpocmVmPSIjTiIgZmlsbD0idXJsKCNKKSIgc3R5bGU9Im1peC1ibGVuZC1tb2RlOmNvbG9yLWRvZGdlIiBjbGFzcz0iRSIvPjx1c2UgeGxpbms6aHJlZj0iI04iIGZpbGw9InVybCgjSykiIHN0eWxlPSJtaXgtYmxlbmQtbW9kZTpjb2xvci1kb2RnZSIgY2xhc3M9IkUiLz48dXNlIHhsaW5rOmhyZWY9IiNOIiBmaWxsPSJ1cmwoI0wpIiBzdHlsZT0ibWl4LWJsZW5kLW1vZGU6Y29sb3ItZG9kZ2UiIGNsYXNzPSJFIi8+PHVzZSB4bGluazpocmVmPSIjTiIgY2xhc3M9IkYgRyIvPjxwYXRoIGQ9Ik04MS40MjUgNjk1LjE5NUg1NjkuMjd2NTguNWwtMzUuNzYgMzcuMTMxLTQ1Mi4wODUuMzY5di05NnoiIGZpbGw9IiNhZDg2ZmYiLz48cGF0aCBkPSJNMzI1LjIzMSAzMTUuMDA5bC0uMDAxLTIzNi44MDJtLTcuNSAyMzYuMjY1Vjk1Ljg5MmwtMTguNS0xOC42OTdtMzMuNSAyMzcuMjc3Vjk1Ljg5MmwxOC41LTE4LjY5N20tNDAuNSAyMzcuNTQ1Vjk5LjQzbC0yMi0yMi4yMzRtNTIgMjM3LjI3N1Y5OS40M2wyMi0yMi4yMzRtLTM2LjUgMzMxLjY2NmwtLjAwMSAxNzAuNTY1bTcuNTAxLTE3MC41NjV2MTUyLjg4bDE4LjUgMTguNjk3bS0zMy41LTE3MS41Nzd2MTUyLjg4bC0xOC41IDE4LjY5N200MC41LTE3MS4yNDJ2MTQ5LjAwN2wyMiAyMi4yMzVtLTUyLTE3MS43NzV2MTQ5LjU0bC0yMiAyMi4yMzVtLTY2LjY4My0yNjYuMjQzSDQyMi42N2wyOS42IDQ3LjUtMjkuNiA0Ny41SDIyMi4wNDdsLTI4Ljc3Ny00Ny41IDI4Ljc3Ny00Ny41em0uMjIzIDI5Ny41YzAtMTcuMzk3IDE0LjEwMy0zMS41IDMxLjUtMzEuNWgxNDBjMTcuMzk3IDAgMzEuNSAxNC4xMDMgMzEuNSAzMS41cy0xNC4xMDMgMzEuNS0zMS41IDMxLjVoLTE0MGMtMTcuMzk3IDAtMzEuNS0xNC4xMDMtMzEuNS0zMS41em0xMDIgODMuNDk5djk1bS0yNDUtOTZoNDg4IiBjbGFzcz0iRiBHIi8+PHBhdGggZD0iTTUwOC4wMjIgMTc4LjM0YzEwLjgwMy00LjMyMyAxOC40NS0xNS4wMjkgMTguNDUtMjcuNTUgMC0xNi4zNDUtMTMuMDI5LTI5LjU5NS0yOS4xMDEtMjkuNTk1cy0yOS4xMDEgMTMuMjUtMjkuMTAxIDI5LjU5NWMwIDEwLjM4NSA1LjI1OSAxOS41MiAxMy4yMTcgMjQuODAyLjU2Ni0xLjAyIDEuNjEyLTEuNzA1IDIuODA5LTEuNzA1LjI2NSAwIC40ODgtLjI0Ny40MjItLjUwNGEyMC40NyAyMC40NyAwIDAgMS0uNjQ0LTUuMTE1YzAtMTAuNjUyIDguMTA1LTE5LjI4NyAxOC4xMDQtMTkuMjg3LjY4NyAwIDEuMjkzLS40NjMgMS41MjItMS4xMTFsLjA1OC0uMTU4Yy40NzEtMS4yNi0uMzE0LTMuMDQzLTEuNjI1LTMuMzQ1LTYuNy0xLjU0NS0xMi4wMTYtNy4wMjItMTMuNjg4LTE0LjAzNi0uMTkyLS44MDUuNzE0LTEuMzQxIDEuMzczLS44MzlsMjYuNDE2IDIwLjA5N2MuMjg3LjIxOC40MjEuNTgzLjM1OC45MzktLjE4MSAxLjAyMS0uMjc2IDIuMDc1LS4yNzYgMy4xNTIgMCAxLjMzNC4xNDYgMi42MzMuNDIgMy44NzguMDc5LjM2MS0uMDQzLjc0Mi0uMzQ4Ljk1MWE4LjI0IDguMjQgMCAwIDEtNC42NjIgMS40NDdjLTEuMzk3IDAtMi43MTYtLjM1MS0zLjg4LS45NzMtLjM0NC0uMTg0LS43NC0uMjU1LTEuMTE5LS4xNjUtLjY1Mi4xNTUtMS4xMTIuNzM4LTEuMTEyIDEuNDA4djEyLjE2OWMwIC41MTYtLjQxOC45MzQtLjkzNC45MzRoLTEuNTA2Yy0uNTA0IDAtLjkxMi0uNC0uOTc4LS44OTktLjU2LTQuMjI5LTMuOTczLTcuNDgzLTguMTAxLTcuNDgzLS4yNjIgMC0uNTIxLjAxMy0uNzc3LjAzOS0uMzA0LjAzLS41MjQuMjk0LS41MjQuNiAwIC4zMzUuMjY0LjYwNy41OTYuNjUzIDMuMzk5LjQ3MSA2LjAyNCAzLjU1MyA2LjAyNCA3LjI4NWE3LjgzIDcuODMgMCAwIDEtLjEzNyAxLjQ2NGMtLjEwMS41MjcuMjc4IDEuMDU5LjgxNSAxLjA1OWguNzYyYS4wMi4wMiAwIDAgMSAuMDIuMDIuMDIuMDIgMCAwIDAgLjAyLjAyaDUuODk0Yy4wNjUgMCAuMTI4LjAyNS4xNzQuMDcxaDBhMTUuNTIgMTUuNTIgMCAwIDEgLjUwOS41MmMuMzUuMzguNDkyLjkxNS41NSAxLjY2MnptLTI3LjQxOS0zMS42NWMtLjQ4OC0uMzg5LS4xOTMtMS4xMjYuNDMxLTEuMTI2aDE2LjYyNmMuNjI0IDAgLjkxOS43MzcuNDMxIDEuMTI2LTIuNDM2IDEuOTQtNS40NjMgMy4wODktOC43NDQgMy4wODlzLTYuMzA5LTEuMTQ5LTguNzQ0LTMuMDg5em0zMS41IDUuMzAzYzAgLjkyMi0uNzA1IDEuNjY5LTEuNTc1IDEuNjY5cy0xLjU3NS0uNzQ3LTEuNTc1LTEuNjY5LjcwNS0xLjY2OSAxLjU3NS0xLjY2OSAxLjU3NS43NDggMS41NzUgMS42Njl6IiBjbGFzcz0iQiBIIi8+PGcgZmlsdGVyPSJ1cmwoI0UpIiBjbGFzcz0iSSI+PHRleHQgZmlsbD0iIzBmMGYxNiIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSIgc3R5bGU9IndoaXRlLXNwYWNlOnByZSIgZm9udC1zaXplPSIyNiIgZm9udC13ZWlnaHQ9ImJvbGQiIGxldHRlci1zcGFjaW5nPSIwLjA3ZW0iPjx0c3BhbiB5PSI3NTAiIHg9IjMyNSIgY2xhc3M9IkoiPkNMQUlNRUQ8L3RzcGFuPjwvdGV4dD48L2c+PGcgZmlsdGVyPSJ1cmwoI0YpIiBjbGFzcz0iSCBJIEogTCI+PHRleHQgZm9udC1zaXplPSIyNiIgbGV0dGVyLXNwYWNpbmc9IjBlbSIgeD0iNTAlIiB5PSI2MTUiPjx0c3Bhbj5SYWJiaXRIb2xlPC90c3Bhbj48L3RleHQ+PC9nPjxnIGZpbHRlcj0idXJsKCNHKSIgY2xhc3M9IkggSSBKIEwiPjx0ZXh0IGZvbnQtc2l6ZT0iMzkuNzU4IiBsZXR0ZXItc3BhY2luZz0iMC4wNWVtIiB4PSI1MCUiIHk9IjM2NSI+MC4wMDAwMDAwMDAwMDAwMDEgV0VUSDwvdGV4dD48L2c+PGcgY2xhc3M9IkYgRyI+PHVzZSB4bGluazpocmVmPSIjTyIvPjx1c2UgeGxpbms6aHJlZj0iI08iIHg9Ii0zNTMiLz48dXNlIHhsaW5rOmhyZWY9IiNPIiB5PSIyNTYiLz48dXNlIHhsaW5rOmhyZWY9IiNPIiB4PSItMzUzIiB5PSIyNTYiLz48L2c+PGRlZnM+PGZpbHRlciBpZD0iQiIgeD0iLjczIiB5PSIuMTk1IiB3aWR0aD0iNjQ3IiBoZWlnaHQ9Ijg4OCIgZmlsdGVyVW5pdHM9InVzZXJTcGFjZU9uVXNlIiBjbGFzcz0iQyI+PGZlRmxvb2QgY2xhc3M9IkQiLz48ZmVCbGVuZCBpbj0iU291cmNlR3JhcGhpYyIvPjxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjIyIi8+PC9maWx0ZXI+PGZpbHRlciBpZD0iQyIgeD0iMTMuODE2IiB5PSIxMC4xOTUiIHdpZHRoPSI2MjIiIGhlaWdodD0iODQ3IiBmaWx0ZXJVbml0cz0idXNlclNwYWNlT25Vc2UiIGNsYXNzPSJDIj48ZmVGbG9vZCByZXN1bHQ9IkEiIGNsYXNzPSJEIi8+PGZlQ29sb3JNYXRyaXggaW49IlNvdXJjZUFscGhhIiB2YWx1ZXM9IjAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDEyNyAwIiByZXN1bHQ9IkIiLz48ZmVPZmZzZXQvPjxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjEiLz48ZmVDb21wb3NpdGUgaW4yPSJCIiBvcGVyYXRvcj0ib3V0Ii8+PGZlQ29sb3JNYXRyaXggdmFsdWVzPSIwIDAgMCAwIDAuNzU2IDAgMCAwIDAgMC4yMzc1IDAgMCAwIDAgMSAwIDAgMCAxIDAiLz48ZmVCbGVuZCBpbjI9IkEiIHJlc3VsdD0iQyIvPjxmZUNvbG9yTWF0cml4IGluPSJTb3VyY2VBbHBoYSIgdmFsdWVzPSIwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAxMjcgMCIgcmVzdWx0PSJCIi8+PGZlT2Zmc2V0Lz48ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIzMyIvPjxmZUNvbXBvc2l0ZSBpbjI9IkIiIG9wZXJhdG9yPSJvdXQiLz48ZmVDb2xvck1hdHJpeCB2YWx1ZXM9IjAgMCAwIDAgMC42MDk1IDAgMCAwIDAgMC4xMTI1IDAgMCAwIDAgMSAwIDAgMCAwLjgzIDAiLz48ZmVCbGVuZCBpbjI9IkMiLz48ZmVCbGVuZCBpbj0iU291cmNlR3JhcGhpYyIgcmVzdWx0PSJFIi8+PGZlQ29sb3JNYXRyaXggaW49IlNvdXJjZUFscGhhIiB2YWx1ZXM9IjAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDEyNyAwIiByZXN1bHQ9IkIiLz48ZmVPZmZzZXQvPjxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjEiLz48ZmVDb21wb3NpdGUgaW4yPSJCIiBvcGVyYXRvcj0iYXJpdGhtZXRpYyIgazI9Ii0xIiBrMz0iMSIvPjxmZUNvbG9yTWF0cml4IHZhbHVlcz0iMCAwIDAgMCAwLjYzIDAgMCAwIDAgMC41Mzc1IDAgMCAwIDAgMSAwIDAgMCAxIDAiLz48ZmVCbGVuZCBpbjI9IkUiLz48L2ZpbHRlcj48ZmlsdGVyIGlkPSJEIiB4PSI3NS44MTYiIHk9Ijc2LjE5NSIgd2lkdGg9IjQ5OCIgaGVpZ2h0PSI3MjMiIGZpbHRlclVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgY2xhc3M9IkMiPjxmZUZsb29kIHJlc3VsdD0iQSIgY2xhc3M9IkQiLz48ZmVDb2xvck1hdHJpeCBpbj0iU291cmNlQWxwaGEiIHZhbHVlcz0iMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMTI3IDAiIHJlc3VsdD0iQiIvPjxmZU9mZnNldCBkeT0iNCIvPjxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjIiLz48ZmVDb21wb3NpdGUgaW4yPSJCIiBvcGVyYXRvcj0ib3V0Ii8+PGZlQ29sb3JNYXRyaXggdmFsdWVzPSIwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwLjI1IDAiLz48ZmVCbGVuZCBpbjI9IkEiLz48ZmVCbGVuZCBpbj0iU291cmNlR3JhcGhpYyIvPjwvZmlsdGVyPjxmaWx0ZXIgaWQ9IkUiIHk9IjY3NS41ODQiIGhlaWdodD0iMTM2LjYxMSIgZmlsdGVyVW5pdHM9InVzZXJTcGFjZU9uVXNlIiB4PSIxMDAiIHdpZHRoPSI0NTAiIGNsYXNzPSJDIj48ZmVGbG9vZCByZXN1bHQ9IkEiIGNsYXNzPSJEIi8+PGZlQ29sb3JNYXRyaXggaW49IlNvdXJjZUFscGhhIiB2YWx1ZXM9IjAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDEyNyAwIiByZXN1bHQ9IkIiLz48ZmVPZmZzZXQvPjxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjEuNSIvPjxmZUNvbXBvc2l0ZSBpbjI9IkIiIG9wZXJhdG9yPSJvdXQiLz48ZmVDb2xvck1hdHJpeCB2YWx1ZXM9IjAgMCAwIDAgMC45NjY4NjcgMCAwIDAgMCAwLjU4NTgzMyAwIDAgMCAwIDEgMCAwIDAgMC44NyAwIi8+PGZlQmxlbmQgaW4yPSJBIiByZXN1bHQ9IkMiLz48ZmVDb2xvck1hdHJpeCBpbj0iU291cmNlQWxwaGEiIHZhbHVlcz0iMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMTI3IDAiIHJlc3VsdD0iQiIvPjxmZU9mZnNldC8+PGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iMjkuNSIvPjxmZUNvbXBvc2l0ZSBpbjI9IkIiIG9wZXJhdG9yPSJvdXQiLz48ZmVDb2xvck1hdHJpeCB2YWx1ZXM9IjAgMCAwIDAgMC42MjQxNjcgMCAwIDAgMCAwLjE0NTgzMyAwIDAgMCAwIDEgMCAwIDAgMC45MSAwIi8+PGZlQmxlbmQgaW4yPSJDIi8+PGZlQmxlbmQgaW49IlNvdXJjZUdyYXBoaWMiLz48L2ZpbHRlcj48ZmlsdGVyIGlkPSJGIiB4PSIyMDMuMTY2IiB5PSI1NDMuMzg5IiB3aWR0aD0iMjQzLjYyIiBoZWlnaHQ9IjEzNi45MTYiIGZpbHRlclVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgY2xhc3M9IkMiPjxmZUZsb29kIHJlc3VsdD0iQSIgY2xhc3M9IkQiLz48ZmVDb2xvck1hdHJpeCBpbj0iU291cmNlQWxwaGEiIHZhbHVlcz0iMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMTI3IDAiIHJlc3VsdD0iQiIvPjxmZU9mZnNldC8+PGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iMS41Ii8+PGZlQ29tcG9zaXRlIGluMj0iQiIgb3BlcmF0b3I9Im91dCIvPjxmZUNvbG9yTWF0cml4IHZhbHVlcz0iMCAwIDAgMCAwLjk2Njg2NyAwIDAgMCAwIDAuNTg1ODMzIDAgMCAwIDAgMSAwIDAgMCAwLjg3IDAiLz48ZmVCbGVuZCBpbjI9IkEiIHJlc3VsdD0iQyIvPjxmZUNvbG9yTWF0cml4IGluPSJTb3VyY2VBbHBoYSIgdmFsdWVzPSIwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAxMjcgMCIgcmVzdWx0PSJCIi8+PGZlT2Zmc2V0Lz48ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIyOS41Ii8+PGZlQ29tcG9zaXRlIGluMj0iQiIgb3BlcmF0b3I9Im91dCIvPjxmZUNvbG9yTWF0cml4IHZhbHVlcz0iMCAwIDAgMCAwLjYyNDE2NyAwIDAgMCAwIDAuMTQ1ODMzIDAgMCAwIDAgMSAwIDAgMCAwLjkxIDAiLz48ZmVCbGVuZCBpbjI9IkMiLz48ZmVCbGVuZCBpbj0iU291cmNlR3JhcGhpYyIvPjwvZmlsdGVyPjxmaWx0ZXIgaWQ9IkciIHg9IjE5Ni44NzYiIHk9IjI5MC42MTkiIHdpZHRoPSIyNDcuNyIgaGVpZ2h0PSIxNDcuMDYyIiBmaWx0ZXJVbml0cz0idXNlclNwYWNlT25Vc2UiIGNsYXNzPSJDIj48ZmVGbG9vZCByZXN1bHQ9IkEiIGNsYXNzPSJEIi8+PGZlQ29sb3JNYXRyaXggaW49IlNvdXJjZUFscGhhIiB2YWx1ZXM9IjAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDEyNyAwIiByZXN1bHQ9IkIiLz48ZmVPZmZzZXQvPjxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjEuNSIvPjxmZUNvbXBvc2l0ZSBpbjI9IkIiIG9wZXJhdG9yPSJvdXQiLz48ZmVDb2xvck1hdHJpeCB2YWx1ZXM9IjAgMCAwIDAgMC45NjY4NjcgMCAwIDAgMCAwLjU4NTgzMyAwIDAgMCAwIDEgMCAwIDAgMC44NyAwIi8+PGZlQmxlbmQgaW4yPSJBIiByZXN1bHQ9IkMiLz48ZmVDb2xvck1hdHJpeCBpbj0iU291cmNlQWxwaGEiIHZhbHVlcz0iMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMTI3IDAiIHJlc3VsdD0iQiIvPjxmZU9mZnNldC8+PGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iMjkuNSIvPjxmZUNvbXBvc2l0ZSBpbjI9IkIiIG9wZXJhdG9yPSJvdXQiLz48ZmVDb2xvck1hdHJpeCB2YWx1ZXM9IjAgMCAwIDAgMC42MjQxNjcgMCAwIDAgMCAwLjE0NTgzMyAwIDAgMCAwIDEgMCAwIDAgMC45MSAwIi8+PGZlQmxlbmQgaW4yPSJDIi8+PGZlQmxlbmQgaW49IlNvdXJjZUdyYXBoaWMiLz48L2ZpbHRlcj48cmFkaWFsR3JhZGllbnQgaWQ9IkgiIGN4PSIwIiBjeT0iMCIgcj0iMSIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCg3ODQuMTg0LDAsMCw3NjEuMTcsMzI1LjgxNiwzODAuMTk1KSIgeGxpbms6aHJlZj0iI1AiPjxzdG9wIG9mZnNldD0iLjAxIiBzdG9wLWNvbG9yPSIjYmQwMGZmIiBzdG9wLW9wYWNpdHk9Ii4zOSIvPjxzdG9wIG9mZnNldD0iLjEzNSIgc3RvcC1jb2xvcj0iI2VjN2JmZiIgc3RvcC1vcGFjaXR5PSIuMjIiLz48c3RvcCBvZmZzZXQ9Ii4yNzEiIHN0b3AtY29sb3I9IiNmMjVhZmYiIHN0b3Atb3BhY2l0eT0iLjQ4Ii8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDEwMDM5IiBzdG9wLW9wYWNpdHk9Ii42OSIvPjwvcmFkaWFsR3JhZGllbnQ+PHJhZGlhbEdyYWRpZW50IGlkPSJJIiBjeD0iMCIgY3k9IjAiIHI9IjEiIGdyYWRpZW50VHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzIwLjMxNiA1Ny4xOTUzKSByb3RhdGUoODguNjIzOCkgc2NhbGUoMzMzLjA5NiA1NzkuNzYxKSIgeGxpbms6aHJlZj0iI1AiPjxzdG9wIHN0b3AtY29sb3I9IiM4ZjAwZmYiIHN0b3Atb3BhY2l0eT0iLjUxIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMWMyMzFiIiBzdG9wLW9wYWNpdHk9IjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3Atb3BhY2l0eT0iMCIvPjwvcmFkaWFsR3JhZGllbnQ+PHJhZGlhbEdyYWRpZW50IGlkPSJKIiBjeD0iMCIgY3k9IjAiIHI9IjEiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMi4xMTI1MTU3Mjg1MjkxODRlLTE0LC0zNDUsODc3Ljc3NCw1LjM3NDgxNTU5NzM3Mzg0NDRlLTE0LDMyNy44MTYsODE1LjY5NSkiIHhsaW5rOmhyZWY9IiNQIj48c3RvcCBzdG9wLWNvbG9yPSIjYzEzZmZmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMWMyMzFiIiBzdG9wLW9wYWNpdHk9IjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNjMDBkZmYiIHN0b3Atb3BhY2l0eT0iMCIvPjwvcmFkaWFsR3JhZGllbnQ+PHJhZGlhbEdyYWRpZW50IGlkPSJLIiBjeD0iMCIgY3k9IjAiIHI9IjEiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMjY3Ljk5OTUzNzI3MzM3MTIsLTIuMDAwMDE3NTY0NjU4MDE2NSw4LjU3MjA5MDE5MjMxMzUyMywxMTQ4LjY0ODAxNDY5ODAzNCw2NC4zMTY0LDM4NC4xOTUpIiB4bGluazpocmVmPSIjUCI+PHN0b3Agc3RvcC1jb2xvcj0iI2I5NDZmZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzFjMjMxYiIgc3RvcC1vcGFjaXR5PSIwIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjODYwZGZmIiBzdG9wLW9wYWNpdHk9IjAiLz48L3JhZGlhbEdyYWRpZW50PjxyYWRpYWxHcmFkaWVudCBpZD0iTCIgY3g9IjAiIGN5PSIwIiByPSIxIiBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KC0yNDIsMi45NjM2NDUyNTM5MzY1OTVlLTE0LC0xLjU2NDQwMDU2MDYzNDgwMzZlLTEzLC0xMjc3LjQzLDU3NC4zMTYsMzgyLjE5NSkiIHhsaW5rOmhyZWY9IiNQIj48c3RvcCBzdG9wLWNvbG9yPSIjZGQwZmZmIiBzdG9wLW9wYWNpdHk9Ii45MSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzFjMjMxYiIgc3RvcC1vcGFjaXR5PSIwIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjYTMwZGZmIiBzdG9wLW9wYWNpdHk9IjAiLz48L3JhZGlhbEdyYWRpZW50PjxwYXRoIGlkPSJNIiBkPSJNNDEzLjM4NyA3Ni4xOTVIMjM5LjI0NmMtMi4yNjQgOS43NDEtMTAuOTk5IDE3LTIxLjQzIDE3aC0zOWMtMTAuNDMgMC0xOS4xNjUtNy4yNTktMjEuNDI5LTE3aC00My45NzlsLTMzLjU5MiAzMy41OTJ2NjgxLjQwOGg0NTMuNTAxbDM2LjQ5OS0zNi41di02NDFsLTM3LjUtMzcuNWgtMzcuMDdjLTIuMjY0IDkuNzQxLTEwLjk5OSAxNy0yMS40MyAxN2gtMzljLTEwLjQzIDAtMTkuMTY1LTcuMjU5LTIxLjQyOS0xN3oiLz48cGF0aCBpZD0iTiIgZD0iTTIxNy44MTYgOTQuMTk1YzEwLjYyOCAwIDE5LjU3LTcuMjA3IDIyLjIxLTE3aDE3Mi41ODFjMi42NCA5Ljc5MyAxMS41ODIgMTcgMjIuMjA5IDE3aDM5YzEwLjYyOCAwIDE5LjU3LTcuMjA3IDIyLjIxLTE3aDM1Ljg3NmwzNi45MTQgMzYuOTE1djY0MC4xNzFsLTM1LjkxNCAzNS45MTRIODAuODE2VjExMC4yMDFsMzMuMDA2LTMzLjAwNmg0Mi43ODVjMi42NCA5Ljc5MyAxMS41ODIgMTcgMjIuMjA5IDE3aDM5eiIvPjxwYXRoIGlkPSJPIiBkPSJNNDk5IDM1MXYxMm0wIDB2MTJtMC0xMmgtMTJtMTIgMGgxMm0tMTIgN2E3IDcgMCAxIDEgMC0xNCA3IDcgMCAxIDEgMCAxNHoiLz48bGluZWFyR3JhZGllbnQgaWQ9IlAiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIi8+PC9kZWZzPjwvc3ZnPg==",
        "attributes":
        [
          {
            "trait_type": "Quest ID",
            "value": questId.toString()
          },
          {
            "trait_type": "Token ID",
            "value": tokenId.toString()
          },
          {
            "trait_type": "Total Participants",
            "value": totalParticipants.toString()
          },
          {
            "trait_type": "Claimed",
            "value": claimed.toString()
          },
          {
            "trait_type": "Reward Amount",
            "value": "0.000000000000001"
          },
          {
            "trait_type": "Reward Address",
            "value": wrappedEthAddress.toString().toLowerCase()
          }
        ]
      }

      expect(JSON.parse(metadata)).to.eql(expectedMetada);
    })
  })
})
