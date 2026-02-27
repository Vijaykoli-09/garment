package com.garment.serviceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.garment.DTO.CuttingLotRowDTO;
import com.garment.DTO.PackingChallanDTO;
import com.garment.DTO.PackingChallanRowDTO;
import com.garment.DTO.PackingChallanSizeDetailDTO;
import com.garment.model.*;
import com.garment.repository.*;
import com.garment.service.PackingChallanService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class PackingChallanServiceImpl implements PackingChallanService {

    private final PackingChallanRepository challanRepo;
    private final PackingChallanRowRepository rowRepo;
    private final PackingChallanSizeDetailRepository sizeDetailRepo;
    private final PartyRepository partyRepo;
    private final CuttingLotRowRepository cuttingLotRowRepo;
    private final SizeRepository sizeRepo;
    private final ShadeRepository shadeRepo;
    private final ArtRepository artRepo;
    private final ArtGroupRepository artGroupRepo;

    // ---------- Serial generation ----------
    private static String pad4(int n){ return String.format("%04d", n); }
    private static String makeSerial(int y, int seq){ return "PC-" + y + "-" + pad4(seq); }

    private String nextSerial(LocalDate date){
        int y = (date!=null ? date.getYear() : LocalDate.now().getYear());
        String prefix = "PC-" + y + "-";
        int max = challanRepo.findSerialsByPrefix(prefix).stream()
                .map(s -> { try { return Integer.parseInt(s.split("-")[2]); } catch(Exception e){ return 0; }})
                .max(Integer::compareTo).orElse(0);
        return makeSerial(y, max+1);
    }

    // ---------- CRUD ----------
    @Override
    public PackingChallanDTO create(PackingChallanDTO dto){
        PackingChallan e = toEntity(dto, new PackingChallan());
        e.setSerialNo(nextSerial(dto.getDate()));
        challanRepo.save(e);
        return toDTO(e);
    }

    @Override
    public PackingChallanDTO update(String serialNo, PackingChallanDTO dto){
        PackingChallan e = challanRepo.findById(serialNo)
                .orElseThrow(() -> new NoSuchElementException("Not found: " + serialNo));
        e.getRows().clear();
        toEntity(dto, e);
        challanRepo.save(e);
        return toDTO(e);
    }

    @Override @Transactional(readOnly = true)
    public PackingChallanDTO get(String serialNo){
        return toDTO(challanRepo.findById(serialNo)
                .orElseThrow(() -> new NoSuchElementException("Not found: " + serialNo)));
    }

    @Override @Transactional(readOnly = true)
    public List<PackingChallanDTO> list(){
        return challanRepo.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public void delete(String serialNo){
        challanRepo.findById(serialNo).ifPresent(challanRepo::delete);
    }

    // ---------- Lookups ----------
    @Override @Transactional(readOnly = true)
    public List<String> listCuttingLots() {
        return cuttingLotRowRepo.listCuttingLots();
    }

    @Override @Transactional(readOnly = true)
    public List<CuttingLotRowDTO> getLotDetails(String lot) {
        return cuttingLotRowRepo.findByCutLotNoOrderBySnoAsc(lot).stream().map(r -> {
            CuttingLotRowDTO dto = new CuttingLotRowDTO();
            dto.setId(r.getId());
            dto.setSno(r.getSno());
            dto.setCutLotNo(r.getCutLotNo());
            dto.setArtNo(r.getArtNo());
            dto.setItemName(r.getItemName());
            dto.setShade(r.getShade());
            dto.setPcs(r.getPcs());
            dto.setRate(r.getRate());
            dto.setAmount(r.getAmount());
            return dto;
        }).collect(Collectors.toList());
    }

    @Override @Transactional(readOnly = true)
    public List<Size> listSizes() {
        return sizeRepo.findByFilters(null, null, null);
    }

    @Override @Transactional(readOnly = true)
    public List<Shade> listShades() {
        return shadeRepo.findAll();
    }

    @Override @Transactional(readOnly = true)
    public Optional<BigDecimal> lastRateForWorkOnArt(String workOnArt){
        List<BigDecimal> rates = rowRepo.findRecentRatesForWorkOnArt(workOnArt);
        return rates.isEmpty() ? Optional.empty() : Optional.ofNullable(rates.get(0));
    }

    @Override @Transactional(readOnly = true)
    public Optional<String> artGroupNameByArtNo(String artNo) {
        return artRepo.findFirstByArtNo(artNo)
                .map(art -> art.getArtGroup())
                .flatMap(val -> {
                    if (val == null || val.isBlank()) return Optional.empty();
                    return artGroupRepo.findById(val)
                            .map(ArtGroup::getArtGroupName)
                            .or(() -> Optional.of(val));
                });
    }

    // ---------- Mapping ----------
    private PackingChallan toEntity(PackingChallanDTO dto, PackingChallan e){
        e.setDate(dto.getDate());

        Party party = dto.getPartyId() != null ? partyRepo.findById(dto.getPartyId()).orElse(null) : null;
        e.setParty(party);
        e.setPartyName(party != null ? party.getPartyName() : dto.getPartyName());

        if (dto.getRows() != null){
            int i = 1;
            for (PackingChallanRowDTO r : dto.getRows()){
                PackingChallanRow row = new PackingChallanRow();
                row.setSno(r.getSno() != null ? r.getSno() : i++);
                row.setCuttingLotNo(nS(r.getCuttingLotNo()));
                row.setArtNo(nS(r.getArtNo()));
                row.setWorkOnArt(nS(r.getWorkOnArt()));

                // derive Art Group
                String grpName = (r.getArtGroupName()!=null && !r.getArtGroupName().isBlank())
                        ? r.getArtGroupName()
                        : artGroupNameByArtNo(row.getArtNo()).orElse(null);
                row.setArtGroupName(grpName);

                // Shade: defensive lookup (trim + uppercase fallback)
                if (r.getShadeCode() != null) {
                    String scode = r.getShadeCode().trim();
                    if (!scode.isEmpty()) {
                        Shade found = shadeRepo.findById(scode).orElse(null);
                        if (found == null) {
                            // try uppercase fallback if your codes are stored uppercase
                            found = shadeRepo.findById(scode.toUpperCase()).orElse(null);
                        }
                        row.setShade(found);
                    } else {
                        row.setShade(null);
                    }
                }

                row.setBoxCount(z(r.getBox()));
                row.setPerBox(z(r.getPerBox()));

                Integer pcs = r.getPcs();
                if (pcs == null || pcs == 0)
                    pcs = safeMul(row.getBoxCount(), row.getPerBox());
                row.setPcs(pcs);

                // ---------- Map size details ----------
                row.getSizeDetails().clear();

                BigDecimal sumDetailAmounts = BigDecimal.ZERO;
                BigDecimal chosenRowRate = r.getRate(); // may be null

                if (r.getSizeDetails() != null && !r.getSizeDetails().isEmpty()) {
                    for (PackingChallanSizeDetailDTO sdto : r.getSizeDetails()) {
                        PackingChallanSizeDetail detail = new PackingChallanSizeDetail();
                        detail.setRow(row);

                        if (sdto.getSizeId() != null) {
                            Size size = sizeRepo.findById(sdto.getSizeId()).orElse(null);
                            detail.setSize(size);
                            detail.setSizeName(size != null ? size.getSizeName() : sdto.getSizeName());
                        } else {
                            detail.setSizeName(sdto.getSizeName());
                        }

                        detail.setBoxCount(z(sdto.getBoxCount()));
                        detail.setPerBox(z(sdto.getPerBox()));

                        Integer dpcs = sdto.getPcs();
                        if (dpcs == null || dpcs == 0)
                            dpcs = safeMul(detail.getBoxCount(), detail.getPerBox());
                        detail.setPcs(dpcs);

                        BigDecimal rate = sdto.getRate();
                        if (rate == null)
                            rate = lastRateForWorkOnArt(row.getWorkOnArt()).orElse(BigDecimal.ZERO);
                        detail.setRate(rate);

                        BigDecimal amount = sdto.getAmount();
                        if (amount == null)
                            amount = nz(rate).multiply(BigDecimal.valueOf(dpcs == null ? 0 : dpcs));
                        detail.setAmount(amount);

                        // accumulate
                        if (amount != null) sumDetailAmounts = sumDetailAmounts.add(amount);
                        if (chosenRowRate == null && rate != null && rate.compareTo(BigDecimal.ZERO) != 0) {
                            chosenRowRate = rate;
                        }

                        row.getSizeDetails().add(detail);
                    }
                }

                // If DTO provides row.amount, prefer it, otherwise derive from sizeDetails
                BigDecimal rowAmount = r.getAmount() != null ? r.getAmount() : sumDetailAmounts;
                row.setAmount(rowAmount);

                // Set row.rate: prefer DTO value, otherwise chosenRowRate, otherwise fallback DB lastRate
                if (r.getRate() != null) {
                    row.setRate(r.getRate());
                } else if (chosenRowRate != null && chosenRowRate.compareTo(BigDecimal.ZERO) != 0) {
                    row.setRate(chosenRowRate);
                } else {
                    row.setRate(lastRateForWorkOnArt(row.getWorkOnArt()).orElse(null));
                }

                row.setChallan(e);
                e.getRows().add(row);
            }
        }
        computeTotals(e);
        return e;
    }

    private PackingChallanDTO toDTO(PackingChallan e){
        PackingChallanDTO dto = new PackingChallanDTO();
        dto.setSerialNo(e.getSerialNo());
        dto.setDate(e.getDate());
        dto.setPartyId(e.getParty()!=null ? e.getParty().getId() : null);
        dto.setPartyName(e.getPartyName());
        dto.setTotalBox(e.getTotalBox());
        dto.setTotalPcs(e.getTotalPcs());
        dto.setTotalAmount(e.getTotalAmount());

        dto.setRows(e.getRows().stream().map(r -> {
            PackingChallanRowDTO d = new PackingChallanRowDTO();
            d.setId(r.getId());
            d.setSno(r.getSno());
            d.setCuttingLotNo(r.getCuttingLotNo());
            d.setArtNo(r.getArtNo());
            d.setWorkOnArt(r.getWorkOnArt());
            d.setArtGroupName(r.getArtGroupName());

            if (r.getShade()!=null){
                d.setShadeCode(r.getShade().getShadeCode());
                d.setShadeName(r.getShade().getShadeName());
            }

            d.setBox(r.getBoxCount());
            d.setPerBox(r.getPerBox());
            d.setPcs(r.getPcs());
            d.setRate(r.getRate());
            d.setAmount(r.getAmount());

            // size details
            d.setSizeDetails(
                    r.getSizeDetails().stream().map(sd -> {
                        PackingChallanSizeDetailDTO dtoSd = new PackingChallanSizeDetailDTO();
                        dtoSd.setId(sd.getId());
                        if (sd.getSize()!=null){
                            dtoSd.setSizeId(sd.getSize().getId());
                            dtoSd.setSizeName(sd.getSize().getSizeName());
                        } else {
                            dtoSd.setSizeName(sd.getSizeName());
                        }
                        dtoSd.setBoxCount(sd.getBoxCount());
                        dtoSd.setPerBox(sd.getPerBox());
                        dtoSd.setPcs(sd.getPcs());
                        dtoSd.setRate(sd.getRate());
                        dtoSd.setAmount(sd.getAmount());
                        return dtoSd;
                    }).collect(Collectors.toList())
            );

            return d;
        }).collect(Collectors.toList()));
        return dto;
    }

    private void computeTotals(PackingChallan e){
        int totalBox = e.getRows().stream()
                .flatMap(r -> r.getSizeDetails().stream())
                .mapToInt(sd -> n(sd.getBoxCount()))
                .sum();

        int totalPcs = e.getRows().stream()
                .flatMap(r -> r.getSizeDetails().stream())
                .mapToInt(sd -> n(sd.getPcs()))
                .sum();

        BigDecimal totalAmt = e.getRows().stream()
                .flatMap(r -> {
                    if (r.getSizeDetails().isEmpty()) {
                        return Stream.of(r.getAmount());
                    }
                    return r.getSizeDetails().stream().map(PackingChallanSizeDetail::getAmount);
                })
                .filter(Objects::nonNull)
                .map(BigDecimal::stripTrailingZeros)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        e.setTotalBox(totalBox);
        e.setTotalPcs(totalPcs);
        e.setTotalAmount(totalAmt);
    }

    // ---------- Helpers ----------
    private static String nS(String s){ return s==null ? "" : s.trim(); }
    private static Integer n(Integer v){ return v==null ? 0 : v; }
    private static Integer z(Integer v){ return v==null ? 0 : v; }
    private static BigDecimal nz(BigDecimal v){ return v==null ? BigDecimal.ZERO : v; }
    private static Integer safeMul(Integer a, Integer b){ return (a==null?0:a) * (b==null?0:b); }
}
