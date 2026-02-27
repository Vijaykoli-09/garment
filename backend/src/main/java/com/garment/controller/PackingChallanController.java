package com.garment.controller;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.garment.DTO.ArtGroupDTO;
import com.garment.DTO.CuttingLotRowDTO;
import com.garment.DTO.PackingChallanDTO;
import com.garment.model.Party;
import com.garment.model.Shade;
import com.garment.model.Size;
import com.garment.repository.PartyRepository;
import com.garment.service.PackingChallanService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/packing-challans")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class PackingChallanController {
	private final PackingChallanService svc;
	  private final PartyRepository partyRepo;

	  // CRUD (UI never sends serial on create)
	  @PostMapping 
	  public PackingChallanDTO create(@RequestBody PackingChallanDTO dto)
	  { return svc.create(dto); }
	  
	  @PutMapping("/{serialNo}") 
	  public PackingChallanDTO update(@PathVariable String serialNo, @RequestBody PackingChallanDTO dto)
	  { 
		  return svc.update(serialNo, dto); 
	  }
	  
	  @GetMapping("/{serialNo}") 
	  public PackingChallanDTO get(@PathVariable String serialNo)
	  { return svc.get(serialNo); }
	  
	  @GetMapping 
	  public List<PackingChallanDTO> list()
	  { return svc.list(); }
	  
	  @DeleteMapping("/{serialNo}") 
	  public void delete(@PathVariable String serialNo)
	  { svc.delete(serialNo); }

	// --- Party picker: only Packing category ---
	  @GetMapping("/parties")
	  public List<Party> packingParties() {
	      return partyRepo.findByCategory_CategoryName("Packing");
	  }


	 // Cutting Lot popup + prefill
	  @GetMapping("/cutting-lots")
	  public List<String> lotNumbers() {
	      // Step 1 → get all Cutting Lot numbers
	      return svc.listCuttingLots();
	  }
	  
	  // Cutting Lot popup + prefill
	  @GetMapping("/cutting-lots/{lotNo}")
	  public List<CuttingLotRowDTO> lotDetails(@PathVariable String lotNo) {
	      return svc.getLotDetails(lotNo);
	  }


	  // Size & Shade masters
	  @GetMapping("/sizes")  public List<Size> sizes(){ return svc.listSizes(); }
	  @GetMapping("/shades") public List<Shade> shades(){ return svc.listShades(); }

	  // Latest rate for Work on Art (optional)
	  @GetMapping("/last-rate")
	  public ResponseEntity<BigDecimal> lastRate(@RequestParam("workOnArt") String workOnArt){
	    return ResponseEntity.ok(svc.lastRateForWorkOnArt(workOnArt).orElse(BigDecimal.ZERO));
	  }

	  // Art Group lookup by Art No (used to auto-fill Art Group column)
	  @GetMapping("/art-group")
	    public ResponseEntity<ArtGroupDTO> artGroup(@RequestParam String artNo) {
	        Optional<String> nameOpt = svc.artGroupNameByArtNo(artNo);
	        if (nameOpt.isEmpty()) {
	            return ResponseEntity.noContent().build();
	        }
	        // We only know the NAME here; serialNo/ranges are unknown ⇒ null
	        ArtGroupDTO dto = new ArtGroupDTO(null, nameOpt.get(), null, null);
	        return ResponseEntity.ok(dto);
	    }

}
