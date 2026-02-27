//package com.garment.serviceImpl;
//
//import com.garment.DTO.DyeingOutwardDTO;
//import com.garment.DTO.DyeingOutwardRowDTO;
//import com.garment.model.DyeingOutward;
//import com.garment.model.DyeingOutwardRow;
//import com.garment.repository.DyeingOutwardRepository;
//import com.garment.service.DyeingOutwardService;
//
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.util.List;
//import java.util.stream.Collectors;
//
//@Service
//public class DyeingOutwardServiceImpl implements DyeingOutwardService {
//
//    private final DyeingOutwardRepository repo;
//
//    public DyeingOutwardServiceImpl(DyeingOutwardRepository repo) {
//        this.repo = repo;
//    }
//
//    @Override
//    public List<DyeingOutward> listAll() {
//        return repo.findAll();
//    }
//
//    @Override
//    public DyeingOutward getById(Long id) {
//        return repo.findById(id).orElse(null);
//    }
//
//    @Override
//    @Transactional
//    public DyeingOutward create(DyeingOutwardDTO dto) {
//        DyeingOutward entity = dtoToEntity(dto);
//        return repo.save(entity);
//    }
//
//    @Override
//    @Transactional
//    public DyeingOutward update(Long id, DyeingOutwardDTO dto) {
//        DyeingOutward existing = repo.findById(id).orElse(null);
//        if (existing == null) {
//            return null; // no exception handling per user request
//        }
//
//        // update parent fields
//        existing.setChallanNo(dto.getChallanNo());
//        existing.setDated(dto.getDated());
//        existing.setPartyName(dto.getPartyName());
//        existing.setNarration(dto.getNarration());
//        existing.setVehicleNo(dto.getVehicleNo());
//        existing.setThrough(dto.getThrough());
//
//        // update child rows
//        if (dto.getRows() != null) {
//            List<DyeingOutwardRow> rows = dto.getRows()
//                    .stream()
//                    .map(this::dtoToRowEntity)
//                    .collect(Collectors.toList());
//            existing.setRows(rows);
//        }
//
//        return repo.save(existing);
//    }
//
//    @Override
//    public void delete(Long id) {
//        repo.deleteById(id);
//    }
//
//    // ✅ Helper methods
//
//    private DyeingOutward dtoToEntity(DyeingOutwardDTO dto) {
//        DyeingOutward out = new DyeingOutward();
//        out.setChallanNo(dto.getChallanNo());
//        out.setDated(dto.getDated());
//        out.setPartyName(dto.getPartyName());
//        out.setNarration(dto.getNarration());
//        out.setVehicleNo(dto.getVehicleNo());
//        out.setThrough(dto.getThrough());
//
//        if (dto.getRows() != null) {
//            List<DyeingOutwardRow> rows = dto.getRows()
//                    .stream()
//                    .map(this::dtoToRowEntity)
//                    .collect(Collectors.toList());
//            out.setRows(rows);
//        }
//
//        return out;
//    }
//
//    private DyeingOutwardRow dtoToRowEntity(DyeingOutwardRowDTO r) {
//        DyeingOutwardRow row = new DyeingOutwardRow();
//        row.setLotNo(r.getLotNo());
//        row.setFabricName(r.getFabricName());
//        row.setShade(r.getShade());
//        row.setMcSize(r.getMcSize());
//        row.setGreyGSM(r.getGreyGSM());
//        row.setRegdSize(r.getRegdSize());
//        row.setProcessing(r.getProcessing());
//        row.setRoll(r.getRoll());
//        row.setWeight(r.getWeight());
//        row.setKnittingYarnRate(r.getKnittingYarnRate());
//        row.setRate(r.getRate());
//        row.setAmount(r.getAmount());
//        return row;
//    }
//}
